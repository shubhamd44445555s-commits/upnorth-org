import { createClient } from '@supabase/supabase-js'
import {
  canRole,
  cleanId,
  permissionForAction,
  permissionsForRole,
  validateAdminPayload,
} from '../lib/admin-security.js'

const requestBuckets = new Map()

function response(res, status, body) {
  res.status(status).json(body)
}

function getBearerToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

function getRequestBody(req) {
  if (!req.body) return {}
  if (typeof req.body === 'object') return req.body
  if (typeof req.body !== 'string' || req.body.length > 12000) throw new Error('Request body is invalid.')
  try { return JSON.parse(req.body) } catch { throw new Error('Request body is invalid.') }
}

function enforceSameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return
  let originHost
  try { originHost = new URL(origin).host } catch { throw Object.assign(new Error('Origin is invalid.'), { status: 403 }) }
  const requestHost = req.headers['x-forwarded-host'] || req.headers.host
  if (requestHost && originHost !== requestHost) throw Object.assign(new Error('Origin is not allowed.'), { status: 403 })
}

function checkRateLimit(userId, action) {
  const key = `${userId}:${action}`
  const now = Date.now()
  const current = requestBuckets.get(key) || { startedAt: now, count: 0 }
  if (now - current.startedAt > 60_000) {
    requestBuckets.set(key, { startedAt: now, count: 1 })
    return
  }
  current.count += 1
  requestBuckets.set(key, current)
  if (current.count > 60) throw Object.assign(new Error('Too many requests. Please try again shortly.'), { status: 429 })
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) throw Object.assign(new Error('Admin service is not configured.'), { status: 503 })
  return { url, key }
}

function createUserClient(accessToken) {
  const { url, key } = getSupabaseConfig()
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}

function requestMeta(req) {
  return {
    ipAddress: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim().slice(0, 80) || null,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 250) || null,
  }
}

async function recordAudit(client, actor, action, entityType, entityId, req, metadata = {}) {
  const meta = requestMeta(req)
  const fullEntry = {
    actor_id: actor.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    ip_address: meta.ipAddress,
    user_agent: meta.userAgent,
    success: true,
  }
  let result = await client.from('audit_logs').insert(fullEntry)
  if (result.error && /column|schema cache|could not find/i.test(result.error.message || '')) {
    result = await client.from('audit_logs').insert({ ...fullEntry, ip_address: undefined, user_agent: undefined, success: undefined })
  }
  if (result.error) throw result.error
}

async function recordSecurityEvent(client, actor, eventType, req, metadata = {}, success = true) {
  if (!canRole(actor.role, 'audit.write')) return
  const meta = requestMeta(req)
  const result = await client.from('security_events').insert({
    actor_id: actor.id,
    event_type: eventType,
    success,
    ip_address: meta.ipAddress,
    user_agent: meta.userAgent,
    metadata,
  })
  if (result.error && !/relation .* does not exist|schema cache|column/i.test(result.error.message || '')) throw result.error
}

async function requireAdmin(req, action) {
  const token = getBearerToken(req)
  if (!token) throw Object.assign(new Error('Authentication required.'), { status: 401 })
  const client = createUserClient(token)
  const { data: userData, error: userError } = await client.auth.getUser(token)
  if (userError || !userData.user) throw Object.assign(new Error('Authentication required.'), { status: 401 })
  checkRateLimit(userData.user.id, action)

  const { data: profile, error: profileError } = await client
    .from('profiles')
    .select('id,email,role')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError || !profile || !canRole(profile.role, permissionForAction(action))) {
    throw Object.assign(new Error('You do not have permission for this action.'), { status: 403 })
  }
  return { client, user: userData.user, profile, permissions: permissionsForRole(profile.role) }
}

async function loadOverview(client) {
  const [submissions, claims, listings, events, towns, subscribers, contacts] = await Promise.all([
    client.from('business_submissions').select('*').order('created_at', { ascending: false }),
    client.from('listing_claims').select('*').order('created_at', { ascending: false }),
    client.from('listings').select('*').order('created_at', { ascending: false }),
    client.from('events').select('*').order('date_sort', { ascending: true }),
    client.from('towns').select('*').order('name', { ascending: true }),
    client.from('newsletter_subscribers').select('email', { count: 'exact', head: true }),
    client.from('contact_messages').select('id', { count: 'exact', head: true }),
  ])
  const firstError = submissions.error || claims.error || listings.error || events.error || towns.error
  if (firstError) throw firstError
  const listingRows = listings.data || []
  return {
    submissions: submissions.data || [],
    claims: claims.data || [],
    listings: listingRows,
    events: events.data || [],
    towns: towns.data || [],
    stats: {
      businesses: listingRows.length,
      featuredBusinesses: listingRows.filter((item) => item.is_featured).length,
      events: (events.data || []).length,
      towns: (towns.data || []).length,
      pendingApprovals: (submissions.data || []).filter((item) => item.status === 'pending').length + (claims.data || []).filter((item) => item.status === 'pending').length,
      newsletterSubscribers: subscribers.count || 0,
      contactMessages: contacts.count || 0,
    },
  }
}

function slugify(value) {
  return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90)
}

async function reviewSubmission(client, actor, input, req) {
  const { data: submission, error: findError } = await client.from('business_submissions').select('*').eq('id', input.id).maybeSingle()
  if (findError) throw findError
  if (!submission) throw Object.assign(new Error('Submission not found.'), { status: 404 })
  if (submission.status !== 'pending') throw Object.assign(new Error('This submission has already been reviewed.'), { status: 409 })

  const nextStatus = input.decision === 'approve' ? 'approved' : 'rejected'
  const update = await client.from('business_submissions').update({
    status: nextStatus,
    reviewer_notes: input.reviewerNotes,
    reviewed_by: actor.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', submission.id).eq('status', 'pending')
  if (update.error) throw update.error

  if (input.decision === 'approve') {
    if (submission.submission_type === 'claim' && submission.listing_id) {
      let lookup = await client.from('listings').select('id').eq('id', submission.listing_id).maybeSingle()
      if (lookup.error) throw lookup.error
      if (!lookup.data) lookup = await client.from('listings').select('id').eq('slug', submission.listing_id).maybeSingle()
      if (lookup.error) throw lookup.error
      if (!lookup.data) throw Object.assign(new Error('Claimed listing not found.'), { status: 404 })
      const listingUpdate = await client.from('listings').update({
        name: submission.business_name,
        category: submission.category,
        subtype: submission.subtype,
        town: submission.town,
        address: submission.address,
        phone: submission.phone,
        website: submission.website,
        description: submission.description,
        status: 'published',
      }).eq('id', lookup.data.id)
      if (listingUpdate.error) throw listingUpdate.error
    } else {
      const listingInsert = await client.from('listings').upsert({
        id: `submission-${submission.id}`,
        slug: `${slugify(submission.business_name) || 'listing'}-${String(submission.id).slice(-6)}`,
        name: submission.business_name,
        category: submission.category,
        subtype: submission.subtype,
        town: submission.town,
        tags: [],
        description: submission.description,
        images: [],
        is_featured: submission.tier === 'featured',
        is_enhanced: submission.tier !== 'free',
        phone: submission.phone,
        website: submission.website,
        address: submission.address,
        status: 'published',
      }, { onConflict: 'id' })
      if (listingInsert.error) throw listingInsert.error
    }
  }
  await recordAudit(client, actor, `submission_${nextStatus}`, 'business_submission', submission.id, req, { submission_type: submission.submission_type })
  await recordSecurityEvent(client, actor, 'ADMIN_SUBMISSION_REVIEWED', req, { decision: input.decision, submission_id: submission.id })
}

async function reviewClaim(client, actor, input, req) {
  const { data: claim, error: findError } = await client.from('listing_claims').select('*').eq('id', input.id).maybeSingle()
  if (findError) throw findError
  if (!claim) throw Object.assign(new Error('Claim not found.'), { status: 404 })
  if (claim.status !== 'pending') throw Object.assign(new Error('This claim has already been reviewed.'), { status: 409 })
  const nextStatus = input.decision === 'approve' ? 'approved' : 'rejected'
  const update = await client.from('listing_claims').update({
    status: nextStatus,
    reviewer_notes: input.reviewerNotes,
    reviewed_by: actor.id,
    reviewed_at: new Date().toISOString(),
  }).eq('id', claim.id).eq('status', 'pending')
  if (update.error) throw update.error
  if (input.decision === 'approve') {
    const listingUpdate = await client.from('listings').update({ status: 'published' }).eq('id', claim.listing_id)
    if (listingUpdate.error) throw listingUpdate.error
  }
  await recordAudit(client, actor, `claim_${nextStatus}`, 'listing_claim', claim.id, req, { listing_id: claim.listing_id })
  await recordSecurityEvent(client, actor, 'ADMIN_CLAIM_REVIEWED', req, { decision: input.decision, claim_id: claim.id })
}

async function updateListing(client, actor, input, req) {
  const result = await client.from('listings').update(input.changes).eq('id', input.id)
  if (result.error) throw result.error
  await recordAudit(client, actor, 'listing_updated', 'listing', input.id, req, input.changes)
  await recordSecurityEvent(client, actor, 'ADMIN_LISTING_UPDATED', req, { listing_id: input.id, changes: input.changes })
}

async function updateEvent(client, actor, input, req) {
  const result = await client.from('events').update({ status: input.status }).eq('id', input.id)
  if (result.error) throw result.error
  await recordAudit(client, actor, 'event_status_updated', 'event', input.id, req, { status: input.status })
  await recordSecurityEvent(client, actor, 'ADMIN_EVENT_UPDATED', req, { event_id: input.id, status: input.status })
}

async function updateUserRole(client, actor, input, req) {
  if (actor.id === input.id) throw Object.assign(new Error('You cannot change your own administrator role.'), { status: 403 })
  if (input.role === 'super_admin' && actor.role !== 'super_admin') throw Object.assign(new Error('Only a super administrator can grant that role.'), { status: 403 })
  const result = await client.from('profiles').update({ role: input.role }).eq('id', input.id)
  if (result.error) throw result.error
  await recordAudit(client, actor, 'admin_role_changed', 'profile', input.id, req, { role: input.role })
  await recordSecurityEvent(client, actor, 'ADMIN_ROLE_CHANGED', req, { profile_id: input.id, role: input.role })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return response(res, 405, { error: 'Method not allowed.' })
  try {
    enforceSameOrigin(req)
    const body = getRequestBody(req)
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    const input = validateAdminPayload(action, body)
    const auth = await requireAdmin(req, action)
    const { client, user, profile, permissions } = auth

    if (action === 'overview') {
      const data = await loadOverview(client)
      await recordSecurityEvent(client, profile, 'ADMIN_OVERVIEW_VIEWED', req)
      return response(res, 200, { ok: true, data, actor: { id: user.id, email: profile.email, role: profile.role, permissions } })
    }
    if (action === 'audit_logs') {
      const result = await client.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100)
      if (result.error) throw result.error
      return response(res, 200, { ok: true, logs: result.data || [] })
    }
    if (action === 'security_events') {
      const result = await client.from('security_events').select('*').order('created_at', { ascending: false }).limit(100)
      if (result.error && !/relation .* does not exist|schema cache/i.test(result.error.message || '')) throw result.error
      return response(res, 200, { ok: true, events: result.data || [] })
    }
    if (action === 'users') {
      const result = await client.from('profiles').select('id,email,role,created_at,updated_at').order('created_at', { ascending: false }).limit(200)
      if (result.error) throw result.error
      return response(res, 200, { ok: true, users: result.data || [] })
    }
    if (action === 'review_submission') await reviewSubmission(client, profile, input, req)
    if (action === 'review_claim') await reviewClaim(client, profile, input, req)
    if (action === 'update_listing') await updateListing(client, profile, input, req)
    if (action === 'update_event') await updateEvent(client, profile, input, req)
    if (action === 'update_user_role') await updateUserRole(client, profile, input, req)
    return response(res, 200, { ok: true })
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500
    if (status >= 500) console.error('Admin request failed:', error?.message || 'unknown error')
    return response(res, status, { error: status >= 500 ? 'The admin request could not be completed.' : error.message })
  }
}

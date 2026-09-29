import { createClient } from '@supabase/supabase-js'
import {
  canRole,
  cleanId,
  isPublicSiteSettingKey,
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
  if (typeof req.body === 'object' && !Array.isArray(req.body)) return req.body
  if (typeof req.body !== 'string' || req.body.length > 12000) throw Object.assign(new Error('Request body is invalid.'), { status: 400 })
  try { return JSON.parse(req.body) } catch { throw Object.assign(new Error('Request body is invalid.'), { status: 400 }) }
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

function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw Object.assign(new Error('This provider operation is not configured.'), { status: 503 })
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
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

function changedFields(beforeData, afterData) {
  const before = beforeData && typeof beforeData === 'object' ? beforeData : {}
  const after = afterData && typeof afterData === 'object' ? afterData : {}
  return [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .slice(0, 100)
}

async function recordChangeHistory(client, actor, action, entityType, entityId, req, beforeData, afterData) {
  const meta = requestMeta(req)
  const result = await client.from('admin_change_history').insert({
    actor_id: actor.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    before_data: beforeData || null,
    after_data: afterData || null,
    changed_fields: changedFields(beforeData, afterData),
    ip_address: meta.ipAddress,
    user_agent: meta.userAgent,
  })
  // The migration is additive. Keep existing admin operations usable until the
  // client applies it, while audit_logs continues to capture the action.
  if (result.error && /relation .* does not exist|schema cache|column/i.test(result.error.message || '')) return
  if (result.error) throw result.error
}

async function getRow(client, table, column, value) {
  const result = await client.from(table).select('*').eq(column, value).maybeSingle()
  if (result.error) throw result.error
  return result.data || null
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
    .select('id,email,role,status')
    .eq('id', userData.user.id)
    .maybeSingle()
  if (profileError || !profile || profile.status === 'suspended' || !canRole(profile.role, permissionForAction(action))) {
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

async function createListing(client, actor, input, req) {
  const result = await client.from('listings').insert(input)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'listing_created', 'listing', input.id, req, null, input)
  await recordAudit(client, actor, 'listing_created', 'listing', input.id, req, { slug: input.slug })
  await recordSecurityEvent(client, actor, 'ADMIN_LISTING_CREATED', req, { listing_id: input.id })
}

async function deleteListing(client, actor, input, req) {
  const existing = await getRow(client, 'listings', 'id', input.id)
  if (!existing) throw Object.assign(new Error('Listing not found.'), { status: 404 })
  const result = await client.from('listings').delete().eq('id', input.id)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'listing_deleted', 'listing', input.id, req, existing, null)
  await recordAudit(client, actor, 'listing_deleted', 'listing', input.id, req, { name: existing.name })
  await recordSecurityEvent(client, actor, 'ADMIN_LISTING_DELETED', req, { listing_id: input.id })
}

async function loadTowns(client) {
  const result = await client.from('towns').select('*').order('name', { ascending: true })
  if (result.error) throw result.error
  return result.data || []
}

async function createTown(client, actor, input, req) {
  const result = await client.from('towns').insert(input)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'town_created', 'town', input.slug, req, null, input)
  await recordAudit(client, actor, 'town_created', 'town', input.slug, req)
  await recordSecurityEvent(client, actor, 'ADMIN_TOWN_CREATED', req, { slug: input.slug })
}

async function updateTown(client, actor, input, req) {
  const before = await getRow(client, 'towns', 'slug', input.id)
  if (!before) throw Object.assign(new Error('Town not found.'), { status: 404 })
  const result = await client.from('towns').update(input.changes).eq('slug', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'towns', 'slug', input.id)
  await recordChangeHistory(client, actor, 'town_updated', 'town', input.id, req, before, after)
  await recordAudit(client, actor, 'town_updated', 'town', input.id, req, input.changes)
  await recordSecurityEvent(client, actor, 'ADMIN_TOWN_UPDATED', req, { slug: input.id })
}

async function deleteTown(client, actor, input, req) {
  const before = await getRow(client, 'towns', 'slug', input.id)
  if (!before) throw Object.assign(new Error('Town not found.'), { status: 404 })
  const listings = await client.from('listings').select('id').eq('town', input.id).limit(1)
  if (listings.error) throw listings.error
  if (listings.data?.length) throw Object.assign(new Error('Move or archive this town’s listings before deleting it.'), { status: 409 })
  const events = await client.from('events').select('id').eq('town', input.id).limit(1)
  if (events.error) throw events.error
  if (events.data?.length) throw Object.assign(new Error('Move or archive this town’s events before deleting it.'), { status: 409 })
  const result = await client.from('towns').delete().eq('slug', input.id)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'town_deleted', 'town', input.id, req, before, null)
  await recordAudit(client, actor, 'town_deleted', 'town', input.id, req)
  await recordSecurityEvent(client, actor, 'ADMIN_TOWN_DELETED', req, { slug: input.id })
}

async function loadMedia(client) {
  const result = await client.storage.from('listing-images').list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
  if (result.error) throw result.error
  return result.data || []
}

async function loadArticles(client) {
  const result = await client.from('admin_articles').select('*').order('updated_at', { ascending: false })
  if (result.error) throw result.error
  return result.data || []
}

async function saveArticle(client, actor, input, req) {
  const result = await client.from('admin_articles').insert({ ...input, author_id: actor.id, published_at: input.status === 'published' ? new Date().toISOString() : null })
  if (result.error) throw result.error
  const after = await getRow(client, 'admin_articles', 'id', input.id)
  await recordChangeHistory(client, actor, 'article_created', 'article', input.id, req, null, after || input)
  await recordAudit(client, actor, 'article_created', 'article', input.id, req, { slug: input.slug })
}

async function updateArticle(client, actor, input, req) {
  const before = await getRow(client, 'admin_articles', 'id', input.id)
  if (!before) throw Object.assign(new Error('Article not found.'), { status: 404 })
  const changes = { ...input.changes }
  if (changes.status === 'published') changes.published_at = new Date().toISOString()
  const result = await client.from('admin_articles').update(changes).eq('id', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'admin_articles', 'id', input.id)
  await recordChangeHistory(client, actor, 'article_updated', 'article', input.id, req, before, after)
  await recordAudit(client, actor, 'article_updated', 'article', input.id, req, { status: changes.status })
}

async function deleteArticle(client, actor, input, req) {
  const before = await getRow(client, 'admin_articles', 'id', input.id)
  if (!before) throw Object.assign(new Error('Article not found.'), { status: 404 })
  const result = await client.from('admin_articles').delete().eq('id', input.id)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'article_deleted', 'article', input.id, req, before, null)
  await recordAudit(client, actor, 'article_deleted', 'article', input.id, req)
}

async function loadCategories(client) {
  const result = await client.from('admin_categories').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })
  if (result.error) throw result.error
  return result.data || []
}

async function saveCategory(client, actor, input, req) {
  const result = await client.from('admin_categories').insert(input)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'category_created', 'category', input.id, req, null, input)
  await recordAudit(client, actor, 'category_created', 'category', input.id, req, { slug: input.slug })
}

async function updateCategory(client, actor, input, req) {
  const before = await getRow(client, 'admin_categories', 'id', input.id)
  if (!before) throw Object.assign(new Error('Category not found.'), { status: 404 })
  const result = await client.from('admin_categories').update(input.changes).eq('id', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'admin_categories', 'id', input.id)
  await recordChangeHistory(client, actor, 'category_updated', 'category', input.id, req, before, after)
  await recordAudit(client, actor, 'category_updated', 'category', input.id, req)
}

async function deleteCategory(client, actor, input, req) {
  const before = await getRow(client, 'admin_categories', 'id', input.id)
  if (!before) throw Object.assign(new Error('Category not found.'), { status: 404 })
  const result = await client.from('admin_categories').delete().eq('id', input.id)
  if (result.error) throw result.error
  await recordChangeHistory(client, actor, 'category_deleted', 'category', input.id, req, before, null)
  await recordAudit(client, actor, 'category_deleted', 'category', input.id, req)
}

async function sendNewsletter(client, actor, input, req) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) throw Object.assign(new Error('Newsletter sending is not configured yet.'), { status: 503 })
  const subscribers = await client.from('newsletter_subscribers').select('email').limit(5000)
  if (subscribers.error) throw subscribers.error
  const recipients = (subscribers.data || []).map((row) => row.email).filter(Boolean)
  if (!recipients.length) throw Object.assign(new Error('No newsletter subscribers found.'), { status: 409 })
  const batches = []
  for (let index = 0; index < recipients.length; index += 50) batches.push(recipients.slice(index, index + 50))
  for (const batch of batches) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [from], bcc: batch, subject: input.subject, text: input.text }),
    })
    if (!response.ok) throw Object.assign(new Error('Newsletter provider rejected the message.'), { status: 502 })
  }
  await recordAudit(client, actor, 'newsletter_sent', 'newsletter', 'broadcast', req, { recipient_count: recipients.length, batch_count: batches.length })
  return { recipientCount: recipients.length }
}

async function inviteUser(client, actor, input, req) {
  const service = createServiceClient()
  const result = await service.auth.admin.inviteUserByEmail(input.email)
  if (result.error) throw result.error
  if (result.data?.user?.id) {
    const profile = await service.from('profiles').upsert({ id: result.data.user.id, email: input.email, role: input.role, status: 'active' }, { onConflict: 'id' })
    if (profile.error) throw profile.error
  }
  await recordAudit(client, actor, 'user_invited', 'profile', result.data?.user?.id || input.email, req, { role: input.role })
}

async function setUserStatus(client, actor, input, req) {
  if (actor.id === input.id) throw Object.assign(new Error('You cannot suspend your own account.'), { status: 403 })
  const before = await getRow(client, 'profiles', 'id', input.id)
  if (!before) throw Object.assign(new Error('User not found.'), { status: 404 })
  const result = await client.from('profiles').update({ status: input.status }).eq('id', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'profiles', 'id', input.id)
  await recordChangeHistory(client, actor, input.status === 'suspended' ? 'user_suspended' : 'user_reactivated', 'profile', input.id, req, before, after)
  await recordAudit(client, actor, input.status === 'suspended' ? 'user_suspended' : 'user_reactivated', 'profile', input.id, req)
}

async function revokeUserSessions(client, actor, input, req) {
  if (actor.id === input.id) throw Object.assign(new Error('Use sign out for your current session.'), { status: 403 })
  const service = createServiceClient()
  const result = await service.auth.admin.signOut(input.id, 'global')
  if (result.error) throw result.error
  await recordAudit(client, actor, 'user_sessions_revoked', 'profile', input.id, req)
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
  const before = await getRow(client, 'listings', 'id', input.id)
  if (!before) throw Object.assign(new Error('Listing not found.'), { status: 404 })
  const result = await client.from('listings').update(input.changes).eq('id', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'listings', 'id', input.id)
  await recordChangeHistory(client, actor, 'listing_updated', 'listing', input.id, req, before, after)
  await recordAudit(client, actor, 'listing_updated', 'listing', input.id, req, input.changes)
  await recordSecurityEvent(client, actor, 'ADMIN_LISTING_UPDATED', req, { listing_id: input.id, changes: input.changes })
}

async function updateEvent(client, actor, input, req) {
  const before = await getRow(client, 'events', 'id', input.id)
  if (!before) throw Object.assign(new Error('Event not found.'), { status: 404 })
  const result = await client.from('events').update({ status: input.status }).eq('id', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'events', 'id', input.id)
  await recordChangeHistory(client, actor, 'event_status_updated', 'event', input.id, req, before, after)
  await recordAudit(client, actor, 'event_status_updated', 'event', input.id, req, { status: input.status })
  await recordSecurityEvent(client, actor, 'ADMIN_EVENT_UPDATED', req, { event_id: input.id, status: input.status })
}

async function updateUserRole(client, actor, input, req) {
  if (actor.id === input.id) throw Object.assign(new Error('You cannot change your own administrator role.'), { status: 403 })
  if (input.role === 'super_admin' && actor.role !== 'super_admin') throw Object.assign(new Error('Only a super administrator can grant that role.'), { status: 403 })
  const before = await getRow(client, 'profiles', 'id', input.id)
  if (!before) throw Object.assign(new Error('User not found.'), { status: 404 })
  const result = await client.from('profiles').update({ role: input.role }).eq('id', input.id)
  if (result.error) throw result.error
  const after = await getRow(client, 'profiles', 'id', input.id)
  await recordChangeHistory(client, actor, 'admin_role_changed', 'profile', input.id, req, before, after)
  await recordAudit(client, actor, 'admin_role_changed', 'profile', input.id, req, { role: input.role })
  await recordSecurityEvent(client, actor, 'ADMIN_ROLE_CHANGED', req, { profile_id: input.id, role: input.role })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return response(res, 405, { error: 'Method not allowed.' })
  try {
    enforceSameOrigin(req)
    const body = getRequestBody(req)
    const action = typeof body.action === 'string' ? body.action.trim() : ''
    if (!action) throw Object.assign(new Error('Admin action is required.'), { status: 400 })
    let input
    try { input = validateAdminPayload(action, body) } catch (error) { if (!Number.isInteger(error?.status)) error.status = 400; throw error }
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
    if (action === 'change_history') {
      const result = await client.from('admin_change_history').select('*').order('created_at', { ascending: false }).limit(200)
      if (result.error && !/relation .* does not exist|schema cache/i.test(result.error.message || '')) throw result.error
      return response(res, 200, { ok: true, history: result.data || [] })
    }
    if (action === 'security_events') {
      const result = await client.from('security_events').select('*').order('created_at', { ascending: false }).limit(100)
      if (result.error && !/relation .* does not exist|schema cache/i.test(result.error.message || '')) throw result.error
      return response(res, 200, { ok: true, events: result.data || [] })
    }
    if (action === 'users') {
      const result = await client.from('profiles').select('id,email,role,status,created_at,updated_at').order('created_at', { ascending: false }).limit(200)
      if (result.error) throw result.error
      return response(res, 200, { ok: true, users: result.data || [] })
    }
    if (action === 'newsletter_subscribers') {
      const result = await client.from('newsletter_subscribers').select('email,created_at').order('created_at', { ascending: false }).limit(1000)
      if (result.error) throw result.error
      return response(res, 200, { ok: true, subscribers: result.data || [] })
    }
    if (action === 'contact_messages') {
      const result = await client.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(500)
      if (result.error) throw result.error
      return response(res, 200, { ok: true, messages: result.data || [] })
    }
    if (action === 'articles') return response(res, 200, { ok: true, articles: await loadArticles(client) })
    if (action === 'categories') return response(res, 200, { ok: true, categories: await loadCategories(client) })
    if (action === 'settings') {
      const result = await client.from('site_settings').select('*').order('key', { ascending: true })
      if (result.error) throw result.error
      return response(res, 200, { ok: true, settings: result.data || [] })
    }
    if (action === 'feature_flags') {
      const result = await client.from('feature_flags').select('*').order('key', { ascending: true })
      if (result.error) throw result.error
      return response(res, 200, { ok: true, flags: result.data || [] })
    }
    if (action === 'ai_settings') {
      const result = await client.from('ai_settings').select('enabled,model,system_prompt,monthly_limit,updated_at').eq('id', true).maybeSingle()
      if (result.error) throw result.error
      return response(res, 200, { ok: true, settings: result.data || { enabled: true, model: process.env.GROQ_MODEL || null, system_prompt: null, monthly_limit: 0 } })
    }
    if (action === 'system_status') {
      return response(res, 200, { ok: true, status: {
        supabaseConfigured: Boolean(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) && Boolean(process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY),
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        groqModel: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        resendConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
        supabaseServiceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
        mapsConfigured: Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY),
        stripeConfigured: false,
      } })
    }
    if (action === 'media_list') return response(res, 200, { ok: true, media: await loadMedia(client) })
    if (action === 'towns') return response(res, 200, { ok: true, towns: await loadTowns(client) })
    if (action === 'review_submission') await reviewSubmission(client, profile, input, req)
    if (action === 'review_claim') await reviewClaim(client, profile, input, req)
    if (action === 'create_listing') await createListing(client, profile, input, req)
    if (action === 'delete_listing') await deleteListing(client, profile, input, req)
    if (action === 'create_town') await createTown(client, profile, input, req)
    if (action === 'update_town') await updateTown(client, profile, input, req)
    if (action === 'delete_town') await deleteTown(client, profile, input, req)
    if (action === 'update_listing') await updateListing(client, profile, input, req)
    if (action === 'update_event') await updateEvent(client, profile, input, req)
    if (action === 'update_user_role') await updateUserRole(client, profile, input, req)
    if (action === 'create_article') await saveArticle(client, profile, input, req)
    if (action === 'update_article') await updateArticle(client, profile, input, req)
    if (action === 'delete_article') await deleteArticle(client, profile, input, req)
    if (action === 'create_category') await saveCategory(client, profile, input, req)
    if (action === 'update_category') await updateCategory(client, profile, input, req)
    if (action === 'delete_category') await deleteCategory(client, profile, input, req)
    if (action === 'update_settings' || action === 'update_public_site_settings') {
      const keys = Object.keys(input.settings)
      const existing = await client.from('site_settings').select('*').in('key', keys)
      if (existing.error) throw existing.error
      const publicByKey = Object.fromEntries((existing.data || []).map((entry) => [entry.key, entry.is_public]))
      const entries = Object.entries(input.settings).map(([key, value]) => ({ key, value, is_public: isPublicSiteSettingKey(key) || publicByKey[key] === true, updated_by: profile.id, updated_at: new Date().toISOString() }))
      const result = await client.from('site_settings').upsert(entries, { onConflict: 'key' })
      if (result.error) throw result.error
      const updated = await client.from('site_settings').select('*').in('key', keys)
      if (updated.error) throw updated.error
      const beforeSettings = Object.fromEntries((existing.data || []).map((entry) => [entry.key, entry]))
      const afterSettings = Object.fromEntries((updated.data || []).map((entry) => [entry.key, entry]))
      await recordChangeHistory(client, profile, 'settings_updated', 'site_settings', 'bulk', req, beforeSettings, afterSettings)
      await recordAudit(client, profile, 'settings_updated', 'site_settings', 'bulk', req, { keys: Object.keys(input.settings) })
    }
    if (action === 'update_feature_flag') {
      const before = await getRow(client, 'feature_flags', 'key', input.key)
      const result = await client.from('feature_flags').upsert({ key: input.key, enabled: input.enabled, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      if (result.error) throw result.error
      const after = await getRow(client, 'feature_flags', 'key', input.key)
      await recordChangeHistory(client, profile, 'feature_flag_updated', 'feature_flag', input.key, req, before, after)
      await recordAudit(client, profile, 'feature_flag_updated', 'feature_flag', input.key, req, { enabled: input.enabled })
    }
    if (action === 'newsletter_send') {
      const result = await sendNewsletter(client, profile, input, req)
      return response(res, 200, { ok: true, ...result })
    }
    if (action === 'invite_user') await inviteUser(client, profile, input, req)
    if (action === 'set_user_status') await setUserStatus(client, profile, input, req)
    if (action === 'revoke_user_sessions') await revokeUserSessions(client, profile, input, req)
    if (action === 'update_ai_settings') {
      const before = await getRow(client, 'ai_settings', 'id', true)
      const result = await client.from('ai_settings').upsert({ id: true, ...input.settings, updated_by: profile.id, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      if (result.error) throw result.error
      const after = await getRow(client, 'ai_settings', 'id', true)
      await recordChangeHistory(client, profile, 'ai_settings_updated', 'ai_settings', 'default', req, before, after)
      await recordAudit(client, profile, 'ai_settings_updated', 'ai_settings', 'default', req, { model: input.settings.model, enabled: input.settings.enabled })
    }
    if (action === 'media_delete') {
      const result = await client.storage.from('listing-images').remove([input.path])
      if (result.error) throw result.error
      await recordAudit(client, profile, 'media_deleted', 'media', input.path, req)
    }
    return response(res, 200, { ok: true })
  } catch (error) {
    const status = Number.isInteger(error?.status) ? error.status : 500
    if (status >= 500) console.error('Admin request failed:', error?.message || 'unknown error')
    return response(res, status, { error: status >= 500 ? 'The admin request could not be completed.' : error.message })
  }
}

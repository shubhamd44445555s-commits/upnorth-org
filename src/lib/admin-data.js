import { supabase } from './supabase'

const slugify = (value) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function requireSupabase() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

export async function loadAdminData() {
  const client = requireSupabase()
  const [submissions, claims, listings, events] = await Promise.all([
    client.from('business_submissions').select('*').order('created_at', { ascending: false }),
    client.from('listing_claims').select('*').order('created_at', { ascending: false }),
    client.from('listings').select('*').order('created_at', { ascending: false }),
    client.from('events').select('*').order('date_sort', { ascending: true }),
  ])
  const firstError = submissions.error || claims.error || listings.error || events.error
  if (firstError) throw firstError
  return {
    submissions: submissions.data || [],
    claims: claims.data || [],
    listings: listings.data || [],
    events: events.data || [],
  }
}

async function audit(actorId, action, entityType, entityId, metadata = {}) {
  const client = requireSupabase()
  const { error } = await client.from('audit_logs').insert({ actor_id: actorId, action, entity_type: entityType, entity_id: entityId, metadata })
  if (error) throw error
}

export async function reviewBusinessSubmission(submission, decision, actorId, reviewerNotes = '') {
  const client = requireSupabase()
  const status = decision === 'approve' ? 'approved' : 'rejected'
  const { error } = await client.from('business_submissions').update({ status, reviewer_notes: reviewerNotes || null, reviewed_by: actorId, reviewed_at: new Date().toISOString() }).eq('id', submission.id)
  if (error) throw error

  if (decision === 'approve') {
    if (submission.submission_type === 'claim' && submission.listing_id) {
      let listing = (await client.from('listings').select('id').eq('id', submission.listing_id).maybeSingle()).data
      if (!listing) listing = (await client.from('listings').select('id').eq('slug', submission.listing_id).maybeSingle()).data
      if (listing) {
        const listingUpdate = { name: submission.business_name, category: submission.category, subtype: submission.subtype, town: submission.town, address: submission.address, phone: submission.phone, website: submission.website, description: submission.description, status: 'published' }
        const listingResult = await client.from('listings').update(listingUpdate).eq('id', listing.id)
        if (listingResult.error) throw listingResult.error
      }
    } else {
      const baseSlug = slugify(submission.business_name) || `listing-${submission.id}`
      const listingResult = await client.from('listings').upsert({
        id: `submission-${submission.id}`,
        slug: `${baseSlug}-${submission.id.slice(-6)}`,
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
      if (listingResult.error) throw listingResult.error
    }
  }

  await audit(actorId, `submission_${status}`, 'business_submission', submission.id, { submission_type: submission.submission_type })
}

export async function reviewClaim(claim, decision, actorId, reviewerNotes = '') {
  const client = requireSupabase()
  const status = decision === 'approve' ? 'approved' : 'rejected'
  const claimResult = await client.from('listing_claims').update({ status, reviewer_notes: reviewerNotes || null, reviewed_by: actorId, reviewed_at: new Date().toISOString() }).eq('id', claim.id)
  if (claimResult.error) throw claimResult.error
  if (decision === 'approve') {
    const listingResult = await client.from('listings').update({ status: 'published' }).eq('id', claim.listing_id)
    if (listingResult.error) throw listingResult.error
  }
  await audit(actorId, `claim_${status}`, 'listing_claim', claim.id, { listing_id: claim.listing_id })
}

export async function updateListingFlags(listing, flags, actorId) {
  const client = requireSupabase()
  const { error } = await client.from('listings').update(flags).eq('id', listing.id)
  if (error) throw error
  await audit(actorId, 'listing_flags_updated', 'listing', listing.id, flags)
}

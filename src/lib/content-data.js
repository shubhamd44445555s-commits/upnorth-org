import { supabase } from './supabase'

const mapTown = (row) => ({
  slug: row.slug,
  name: row.name,
  image: row.image,
  intro: row.intro,
  nearestLakes: row.nearest_lakes,
  knownFor: row.known_for,
  nearestLargeTown: row.nearest_large_town,
  nearby: row.nearby || [],
})

const mapListing = (row) => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  category: row.category,
  subtype: row.subtype,
  town: row.town,
  priceRange: row.price_range,
  tags: row.tags || [],
  description: row.description,
  images: row.images || [],
  isFeatured: Boolean(row.is_featured),
  isEnhanced: Boolean(row.is_enhanced),
  phone: row.phone,
  website: row.website,
  address: row.address,
})

const mapEvent = (row) => ({
  id: row.id,
  date: row.date,
  dateSort: row.date_sort,
  title: row.title,
  venue: row.venue,
  town: row.town,
  image: row.image,
  type: row.type,
  description: row.description,
})

const mapArticle = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt || '',
  body: row.body || '',
  heroImage: row.hero_image || '',
  status: row.status,
  seoTitle: row.seo_title || '',
  seoDescription: row.seo_description || '',
  publishedAt: row.published_at || row.created_at,
})

export async function loadPublishedContent() {
  if (!supabase) return null

  const [townsResult, listingsResult, eventsResult, articlesResult] = await Promise.all([
    supabase.from('towns').select('*').eq('status', 'published').order('name'),
    supabase.from('listings').select('*').eq('status', 'published').order('name'),
    supabase.from('events').select('*').eq('status', 'published').order('date_sort'),
    supabase.from('admin_articles').select('*').eq('status', 'published').order('published_at', { ascending: false }),
  ])

  const firstError = townsResult.error || listingsResult.error || eventsResult.error || articlesResult.error
  if (firstError) throw firstError

  return {
    towns: (townsResult.data || []).map(mapTown),
    listings: (listingsResult.data || []).map(mapListing),
    events: (eventsResult.data || []).map(mapEvent),
    articles: (articlesResult.data || []).map(mapArticle),
  }
}

export async function submitBusinessListing(payload) {
  if (!supabase) return { ok: false, reason: 'not-configured' }

  const { data: authData } = await supabase.auth.getUser()
  const { error } = await supabase.from('business_submissions').insert({
    id: payload.id,
    listing_id: payload.listingId || null,
    submission_type: payload.submissionType || 'new',
    submitted_by: authData.user?.id || null,
    business_name: payload.businessName,
    contact_email: payload.contactEmail || null,
    category: payload.category,
    subtype: payload.subtype,
    town: payload.town,
    address: payload.address || null,
    phone: payload.phone || null,
    website: payload.website || null,
    description: payload.description,
    tier: payload.tier || 'free',
    status: 'pending',
  })

  if (error) throw error
  return { ok: true }
}

export async function submitContactMessage(payload) {
  if (!supabase) return { ok: false, reason: 'not-configured' }

  const { error } = await supabase.from('contact_messages').insert({
    id: payload.id,
    name: payload.name,
    email: payload.email,
    topic: payload.topic || 'general',
    town: payload.town || null,
    message: payload.message,
  })

  if (error) throw error
  return { ok: true }
}

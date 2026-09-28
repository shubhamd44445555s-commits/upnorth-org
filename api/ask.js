import { createClient } from '@supabase/supabase-js'
import { getLocalAskResult } from '../src/api/ask.js'

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions'
const DEFAULT_MODEL = 'openai/gpt-oss-20b'
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

function parseModelJson(content) {
  const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(cleaned)
}

function compactListing(listing) {
  return {
    slug: listing.slug,
    name: listing.name,
    town: listing.town,
    category: listing.category,
    subtype: listing.subtype,
    tags: listing.tags,
    description: listing.description,
  }
}

function mapListingRow(row) {
  return {
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
  }
}

async function loadCandidates() {
  if (supabaseUrl && supabaseKey) {
    const client = createClient(supabaseUrl, supabaseKey)
    const { data, error } = await client.from('listings').select('*').eq('status', 'published').order('name')
    if (!error && data?.length) return data.map(mapListingRow)
  }

  return (await import('../src/data/listings.js')).listings
}

async function askGroq(query) {
  const candidateRows = await loadCandidates()
  const candidates = candidateRows.map(compactListing)
  const response = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || DEFAULT_MODEL,
      temperature: 0.25,
      max_tokens: 450,
      messages: [
        {
          role: 'system',
          content: 'You are the UpNorth.org Northwoods concierge. Recommend only listings from the supplied candidate list. Never invent businesses, addresses, prices, events, or hours. Return only valid JSON with this shape: {"message":"short helpful answer","slugs":["listing-slug"]}. Use at most 4 slugs and return the exact supplied slugs.',
        },
        {
          role: 'user',
          content: JSON.stringify({ query, candidates }),
        },
      ],
    }),
  })

  if (!response.ok) throw new Error(`Groq request failed with status ${response.status}`)
  const payload = await response.json()
  const content = payload.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('Groq returned no message')

  const parsed = parseModelJson(content)
  const bySlug = new Map(candidateRows.map((listing) => [listing.slug, listing]))
  const slugs = Array.isArray(parsed.slugs) ? parsed.slugs.filter((slug) => bySlug.has(slug)).slice(0, 4) : []
  const picks = slugs.map((slug) => bySlug.get(slug))

  if (typeof parsed.message !== 'string' || !picks.length) throw new Error('Groq returned invalid listing recommendations')
  return { message: parsed.message, picks }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const query = String(request.body?.query || '').trim().slice(0, 500)
  if (!query) return response.status(400).json({ error: 'A question is required.' })

  try {
    if (process.env.GROQ_API_KEY) return response.status(200).json(await askGroq(query))
    return response.status(200).json(getLocalAskResult(query))
  } catch (error) {
    console.error('Ask provider failed:', error.message)
    const fallback = getLocalAskResult(query)
    return response.status(200).json({
      ...fallback,
      message: 'I could not reach the AI concierge right now, so here are a few local picks to get you started.',
      aiFallback: true,
    })
  }
}

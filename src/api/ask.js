import { listings } from '../data/listings'
import { townBySlug } from '../data/towns'

const normalize = (value) => value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\s-]/g, ' ')

function scoreListing(listing, query) {
  const haystack = normalize([listing.name, listing.category, listing.subtype, listing.town, listing.description, ...listing.tags].join(' '))
  return normalize(query).split(/\s+/).filter(Boolean).reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0) + (listing.isFeatured ? .5 : 0)
}

export function getLocalAskResult(query) {
  const cleanQuery = query.trim()
  const picks = [...listings].sort((a, b) => scoreListing(b, cleanQuery) - scoreListing(a, cleanQuery)).slice(0, 5)
  const townHit = Object.values(townBySlug).find((town) => normalize(cleanQuery).includes(normalize(town.name)))
  const location = townHit ? ` around ${townHit.name}` : ' around the Northwoods'
  return {
    message: `For “${cleanQuery},” I’d start${location} with these local picks. They balance a good place to land with something memorable to do nearby.`,
    picks,
  }
}

export async function askUpNorth(query) {
  const cleanQuery = query.trim()
  if (!cleanQuery) return { message: 'Tell me what kind of Northwoods day you are dreaming about, and I will point you in the right direction.', picks: [] }

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: cleanQuery }),
    })

    if (response.ok) {
      const result = await response.json()
      if (typeof result.message === 'string' && Array.isArray(result.picks)) return result
    }
  } catch {
    // Vite's local frontend does not execute /api routes, so demo fallback remains available.
  }

  return getLocalAskResult(cleanQuery)
}

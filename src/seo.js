import { listingBySlug } from './data/listings'
import { townBySlug } from './data/towns'

const siteUrl = 'https://upnorth.org'

function setMeta(name, content, property = false) {
  const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`
  let node = document.head.querySelector(selector)
  if (!node) { node = document.createElement('meta'); node.setAttribute(property ? 'property' : 'name', name); document.head.appendChild(node) }
  node.setAttribute('content', content)
}

function setJsonLd(data) {
  let node = document.head.querySelector('#upnorth-jsonld')
  if (!node) { node = document.createElement('script'); node.id = 'upnorth-jsonld'; node.type = 'application/ld+json'; document.head.appendChild(node) }
  node.textContent = JSON.stringify(data)
}

export function updateSeo() {
  const path = window.location.pathname
  const townSlug = path.startsWith('/towns/') ? path.split('/')[2] : null
  const listingSlug = path.startsWith('/listing/') ? path.split('/')[2] : null
  const town = townSlug ? townBySlug[townSlug] : null
  const listing = listingSlug ? listingBySlug[listingSlug] : null
  let title = "Upnorth.org — Life's Better Up North"
  let description = 'Explore the lakes, forests, small towns, stays, food, events, and real estate of Wisconsin’s Northwoods.'
  if (town) { title = `${town.name}, WI — Lodging, Dining & Things to Do | UpNorth.org`; description = town.intro }
  if (listing) { title = `${listing.name} — ${townBySlug[listing.town]?.name || ''} | UpNorth.org`; description = listing.description }
  if (path === '/ask') { title = 'Ask UpNorth — Your Northwoods Concierge | UpNorth.org'; description = 'Ask for a cabin, supper club, trail, event, or Northwoods weekend idea.' }
  if (path === '/pricing') { title = 'List Your Business | UpNorth.org'; description = 'Choose a listing tier and help visitors find your Northwoods business.' }
  if (path === '/list-your-business') { title = 'List Your Business | UpNorth.org'; description = 'Submit or claim a Northwoods business listing on UpNorth.org.' }
  if (path === '/about') { title = 'About Up North | UpNorth.org'; description = 'Learn how UpNorth.org connects visitors, locals, and Northwoods businesses with places worth the drive.' }
  if (path === '/contact') { title = 'Contact UpNorth.org'; description = 'Questions, business listings, event ideas, or local tips? Get in touch with the UpNorth.org team.' }
  if (path === '/login') { title = 'Admin Login | UpNorth.org'; description = 'Private UpNorth.org operations login.' }
  if (path === '/admin') { title = 'Admin Dashboard | UpNorth.org'; description = 'Manage UpNorth.org listings, claims, submissions, and events.' }
  document.title = title
  setMeta('description', description)
  setMeta('og:title', title, true)
  setMeta('og:description', description, true)
  setMeta('og:type', 'website', true)
  setMeta('og:url', `${siteUrl}${window.location.pathname}`, true)
  setMeta('robots', path === '/login' || path === '/admin' ? 'noindex,nofollow' : 'index,follow')
  let canonical = document.head.querySelector('link[rel="canonical"]')
  if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
  canonical.href = `${siteUrl}${window.location.pathname}`
  if (listing) setJsonLd({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: listing.name, description: listing.description, telephone: listing.phone, url: listing.website, address: { '@type': 'PostalAddress', streetAddress: listing.address, addressLocality: townBySlug[listing.town]?.name, addressRegion: 'WI', addressCountry: 'US' }, image: listing.images })
  else setJsonLd({ '@context': 'https://schema.org', '@type': 'Organization', name: 'UpNorth.org', url: siteUrl, description })
}

export function installSeo() {
  updateSeo()
  const originalPushState = window.history.pushState
  if (!window.history.__upnorthSeoPatched) {
    window.history.pushState = function pushState(...args) { const result = originalPushState.apply(this, args); window.setTimeout(updateSeo, 0); return result }
    window.history.__upnorthSeoPatched = true
    window.addEventListener('popstate', updateSeo)
  }
}

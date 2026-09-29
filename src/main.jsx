import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { subscribeToUpNorth } from './api/subscribe'
import { events as fallbackEvents } from './data/events'
import { listings as fallbackListings, listingBySlug as fallbackListingBySlug } from './data/listings'
import { townBySlug as fallbackTownBySlug, towns as fallbackTowns } from './data/towns'
import { loadPublishedContent, submitContactMessage } from './lib/content-data'
import { applySiteTheme, DEFAULT_SITE_CONFIG, loadPublicSiteConfig } from './lib/site-config'
import { NorthwoodsMap } from './NorthwoodsMap'
import './styles.css'

let events = fallbackEvents
let listings = fallbackListings
let listingBySlug = fallbackListingBySlug
let townBySlug = fallbackTownBySlug
let towns = fallbackTowns
let articles = []
let articleBySlug = {}

let siteConfig = { ...DEFAULT_SITE_CONFIG }
const siteValue = (key, fallback = '') => siteConfig[key] ?? fallback

const heroImage = DEFAULT_SITE_CONFIG['images.home.hero']
const fallbackImage = 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85'
const aboutHeroImage = 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2200&q=90'
const aboutStoryImage = 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=88'
const contactHeroImage = 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=2200&q=90'
const contactStoryImage = 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=88'
const heroPlaceholders = [
  'Find me a lakefront cabin for 8 near Minocqua with a dock',
  'Plan a 3-day fall weekend around Presque Isle',
  'Where are the fish biting this week?',
]
const discoveryCards = [
  { title: 'Explore the Outdoors', description: 'Fishing, boating, hiking, snowmobiling and more. Adventure is always in season.', action: 'See Activities', image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1000&q=85', query: 'trails, lakes, and outdoor adventures' },
  { title: 'Find a Place to Stay', description: 'Cabins, resorts, vacation rentals and unique stays across the Northwoods.', action: 'Browse Stays', image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1000&q=85', query: 'cabins, resorts, and places to stay' },
  { title: 'Great Food & Local Flavor', description: 'From lakeside bars to fine dining, find your next favorite spot.', action: 'View Restaurants', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85', query: 'supper clubs and local restaurants' },
  { title: 'Charming Towns', description: 'Discover unique shops, events and friendly communities.', action: 'Explore Towns', image: 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=1000&q=85', query: 'Northwoods towns' },
]
const categoryLinks = [
  { label: 'Outdoors', icon: '⛰', href: '/things-to-do' },
  { label: 'Places to Stay', icon: '⌂', href: '/stay' },
  { label: 'Eat & Drink', icon: '⌁', href: '/eat-drink' },
  { label: 'Events', icon: '▦', href: '/events' },
  { label: 'Towns', icon: '⌾', href: '/explore' },
  { label: 'Real Estate', icon: '⌂', href: '/real-estate' },
]
const navGroups = {
  'Things To Do': { href: '/things-to-do', items: ['Fishing & Boating', 'Hiking & Trails', 'Snowmobiling', 'Golf', 'Winter Fun'] },
  'Places to Stay': { href: '/stay', items: ['Cabins', 'Resorts', 'Hotels', 'Campgrounds', 'On the Water'] },
  'Eat & Drink': { href: '/eat-drink', items: ['Supper Clubs', 'Breweries', 'Coffee Shops', 'Lakeside Dining', 'Local Favorites'] },
  Towns: { href: '/explore', items: ['Minocqua', 'Eagle River', 'Rhinelander', 'Boulder Junction', 'Presque Isle'] },
  Events: { href: '/events', items: ['This Weekend', 'Live Music', 'Festivals', 'Farmers Markets', 'Holiday Events'] },
  Guides: { href: '/explore', items: ['First-Timer Guide', 'Fishing Reports', 'Fall Color', 'Winter Trails', 'Trip Ideas'] },
  'Real Estate': { href: '/real-estate', items: ['Lake Homes', 'Cabins for Sale', 'Land & Lots', 'Property Search', 'Local Experts'] },
}
const categoryHeaders = {
  stay: { title: 'Places to Stay', description: 'Cabins, resorts, campgrounds, and rooms made for longer mornings.', image: 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=2200&q=88' },
  'eat-drink': { title: 'Eat & Drink', description: 'Supper clubs, lake bars, breweries, and the local flavors worth the drive.', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=2200&q=88' },
  'things-to-do': { title: 'Things To Do', description: 'Get on the water, hit the trail, and find your next Northwoods story.', image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=2200&q=88' },
  events: { title: 'Events', description: 'Live music, festivals, markets, and good reasons to make a weekend of it.', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=2200&q=88' },
  explore: { title: 'Explore the Northwoods', description: 'Start with a town, a lake, or a little time to wander.', image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2200&q=88' },
  'real-estate': { title: 'Real Estate', description: 'Lake homes, quiet acreage, and local people to help you find your place.', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2200&q=88' },
}
const categoryLabels = { stay: 'Places to Stay', 'eat-drink': 'Eat & Drink', 'things-to-do': 'Things To Do', events: 'Events', explore: 'Explore', 'real-estate': 'Real Estate' }
const filterOptions = {
  stay: [['all', 'All stays'], ['cabin', 'Cabins'], ['resort', 'Resorts'], ['hotel', 'Hotels'], ['B&B', 'B&Bs'], ['campground', 'Campgrounds']],
  'eat-drink': [['all', 'All food & drink'], ['restaurant', 'Restaurants'], ['supper club', 'Supper clubs'], ['bar', 'Bars'], ['brewery', 'Breweries'], ['coffee', 'Coffee shops']],
  'things-to-do': [['all', 'All activities'], ['fishing', 'Fishing'], ['boating', 'Boating'], ['ATV-UTV', 'ATV / UTV'], ['snowmobiling', 'Snowmobiling'], ['hiking', 'Hiking'], ['golf', 'Golf']],
  events: [['all', 'All events'], ['this-week', 'This week'], ['this-month', 'This month'], ['festival', 'Festivals']],
  explore: [['all', 'All experiences'], ['stay', 'Places to stay'], ['eat-drink', 'Eat & drink'], ['things-to-do', 'Things to do'], ['real-estate', 'Real estate']],
  'real-estate': [['all', 'All property'], ['for sale', 'For sale'], ['land', 'Land'], ['agents', 'Agents'], ['cabins', 'Cabins']],
}

const displayTown = (slug) => townBySlug[slug]?.name || slug
const ratingFor = (id) => (4.4 + ((id.length * 3) % 6) / 10).toFixed(1)

function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 4 4" /></>,
    arrow: <><path d="M4 12h14" /><path d="m13 7 5 5-5 5" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    left: <path d="m15 18-6-6 6-6" />,
    right: <path d="m9 18 6-6-6-6" />,
    facebook: <path d="M14 8h3V5h-3c-2.7 0-4 1.6-4 4v2H7v3h3v6h3v-6h3l.5-3H13V9c0-.7.3-1 1-1Z" />,
    instagram: <><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r=".7" fill="currentColor" stroke="none" /></>,
    youtube: <><rect x="3" y="5.5" width="18" height="13" rx="4" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  }
  return <svg aria-hidden="true" className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

function SafeImage({ src, alt = '', ...props }) {
  const [source, setSource] = useState(src || fallbackImage)
  useEffect(() => setSource(src || fallbackImage), [src])
  return <img {...props} src={source} alt={alt} onError={() => setSource((current) => current === fallbackImage ? current : fallbackImage)} />
}

function Logo({ light = false, onNavigate }) {
  return <a className={`logo ${light ? 'logo-light' : ''}`} href="/" onClick={(event) => onNavigate?.(event, '/')} aria-label={`${siteValue('content.brand_name', 'Upnorth.org')} home`}><span className="logo-mark" aria-hidden="true"><i></i><i></i><i></i></span><span className="logo-copy"><strong>{siteValue('content.brand_name', 'Upnorth.org')}</strong><small>{siteValue('content.brand_tagline', 'EXPLORE · STAY · DO · BELONG')}</small></span></a>
}

function SiteHeader({ onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [activeNav, setActiveNav] = useState(null)
  const go = (event, href) => { setActiveNav(null); setMenuOpen(false); onNavigate(event, href) }
  return <header className="site-header"><div className="header-inner"><Logo onNavigate={onNavigate} /><nav className={`primary-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
    {Object.entries(navGroups).map(([key, group]) => { const labelMap = { 'Things To Do': 'content.nav.things_to_do', 'Places to Stay': 'content.nav.places_to_stay', 'Eat & Drink': 'content.nav.eat_drink', Towns: 'content.nav.towns', Events: 'content.nav.events', Guides: 'content.nav.guides', 'Real Estate': 'content.nav.real_estate' }; const label = siteValue(labelMap[key], key); return <div className="nav-dropdown-wrap" key={key}><button className="nav-dropdown-trigger" type="button" onClick={() => setActiveNav((current) => current === key ? null : key)} aria-expanded={activeNav === key}>{label} <span className="caret"><Icon name="chevron" size={12} /></span></button>{activeNav === key && <div className="nav-dropdown-menu"><a href={group.href} onClick={(event) => go(event, group.href)} className="nav-parent-link">Explore {label}</a>{group.items.map((item) => <a key={item} href={group.href} onClick={(event) => go(event, group.href)}>{item}</a>)}</div>}</div> })}
    <div className="more-wrap"><button className="more-trigger" type="button" onClick={() => setMoreOpen(!moreOpen)} aria-expanded={moreOpen}>{siteValue('content.nav.more', 'More')} <span className="caret">⌄</span></button>{moreOpen && <div className="more-menu"><a href="/about" onClick={(event) => go(event, '/about')}>About Up North</a><a href="/#newsletter" onClick={(event) => go(event, '/#newsletter')}>Newsletter</a><a href="/articles" onClick={(event) => go(event, '/articles')}>Guides &amp; stories</a><a href="/list-your-business" onClick={(event) => go(event, '/list-your-business')}>List Your Business</a><a href="/contact" onClick={(event) => go(event, '/contact')}>Contact us</a></div>}</div>
  </nav><div className="header-actions"><button className="icon-button search-trigger" type="button" onClick={(event) => go(event, '/#explore')} aria-label="Focus search"><Icon name="search" size={18} /></button><button className="plan-button" type="button" onClick={(event) => go(event, '/#explore')}>{siteValue('content.nav.plan_cta', 'Plan Your Trip')}</button><button className="mobile-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}><Icon name={menuOpen ? 'close' : 'menu'} size={21} /></button></div></div></header>
}

function SiteFooter({ onNavigate }) {
  return <footer className="site-footer" id="footer"><div className="footer-inner"><Logo light onNavigate={onNavigate} /><div className="footer-links"><a href="/about" onClick={(event) => onNavigate(event, '/about')}>{siteValue('content.footer.about', 'About')}</a><a href="/contact" onClick={(event) => onNavigate(event, '/contact')}>{siteValue('content.footer.contact', 'Contact')}</a><a href="/list-your-business" onClick={(event) => onNavigate(event, '/list-your-business')}>{siteValue('content.footer.business', 'List Your Business')}</a><a href="/events" onClick={(event) => onNavigate(event, '/events')}>{siteValue('content.footer.events', 'Submit an Event')}</a><a href="/#footer" onClick={(event) => onNavigate(event, '/#footer')}>{siteValue('content.footer.privacy', 'Privacy')}</a></div><div className="social-links"><a href="#footer" aria-label="Facebook"><Icon name="facebook" size={17} /></a><a href="#footer" aria-label="Instagram"><Icon name="instagram" size={17} /></a><a href="#footer" aria-label="YouTube"><Icon name="youtube" size={17} /></a></div><div className="footer-script">{siteValue('content.footer.tagline', 'The North\nWoods Call').split('\n').map((line) => <span key={line}>{line}<br /></span>)}</div></div></footer>
}

function SectionHeader({ title, description, href, label, onNavigate, left = false }) {
  return <div className={`section-heading ${left ? 'section-heading-left' : ''}`}><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{href && <a className="section-see-all" href={href} onClick={(event) => onNavigate(event, href)}>{label || 'See all'} <Icon name="arrow" size={13} /></a>}</div>
}

function Breadcrumbs({ items, onNavigate }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb"><a href="/" onClick={(event) => onNavigate(event, '/')}>Home</a>{items.map((item) => <span key={item.href || item.label}><b>/</b>{item.href ? <a href={item.href} onClick={(event) => onNavigate(event, item.href)}>{item.label}</a> : <span>{item.label}</span>}</span>)}</nav>
}

function ListingCard({ listing, onNavigate }) {
  return <article className="listing-card"><a className="listing-image" href={`/listing/${listing.slug}`} onClick={(event) => onNavigate(event, `/listing/${listing.slug}`)}><SafeImage src={listing.images[0]} alt={listing.name} loading="lazy" />{listing.isFeatured && <span className="listing-badge featured">Featured</span>}{!listing.isFeatured && listing.isEnhanced && <span className="listing-badge enhanced">Enhanced</span>}</a><div className="listing-body"><div className="listing-category">{displayTown(listing.town)} · {listing.subtype}</div><h3><a href={`/listing/${listing.slug}`} onClick={(event) => onNavigate(event, `/listing/${listing.slug}`)}>{listing.name}</a></h3><p className="listing-description">{listing.description}</p><div className="listing-bottom"><span className="listing-rating">★ {ratingFor(listing.id)}</span><span className="listing-price">{listing.priceRange}</span></div><div className="listing-tags">{listing.tags.slice(0, 3).map((tag) => <span key={tag}>{tag}</span>)}</div></div></article>
}

function TownCard({ town, onNavigate }) {
  return <a className="town-card route-town-card" href={`/towns/${town.slug}`} onClick={(event) => onNavigate(event, `/towns/${town.slug}`)}><SafeImage src={town.image} alt={`${town.name}, Wisconsin`} loading="lazy" /><span className="town-overlay"><strong>{town.name}</strong><small>{town.knownFor}</small></span></a>
}

function FilterBar({ category, townFilter, setTownFilter, typeFilter, setTypeFilter }) {
  return <div className="filter-bar"><label>Town<select value={townFilter} onChange={(event) => setTownFilter(event.target.value)}><option value="all">All towns</option>{towns.map((town) => <option value={town.slug} key={town.slug}>{town.name}</option>)}</select></label><label>{category === 'events' ? 'When' : category === 'explore' ? 'Explore' : 'Filter by'}<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>{filterOptions[category].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label></div>
}

function EventCard({ event, onNavigate }) {
  return <article className="event-card"><div className="event-image"><SafeImage src={event.image} alt={event.title} loading="lazy" /><span className="date-badge">{event.date}</span></div><div className="event-body"><h3>{event.title}</h3><p>{event.venue} · {displayTown(event.town)}</p><button type="button" onClick={() => onNavigate(null, `/events?town=${event.town}`)}>View event <Icon name="arrow" size={13} /></button></div></article>
}

function ArticleCard({ article, onNavigate }) {
  return <article className="discovery-card article-card"><div className="card-image"><SafeImage src={article.heroImage || fallbackImage} alt={article.title} loading="lazy" /></div><div className="card-body"><span className="editorial-kicker">Up North guide</span><h3>{article.title}</h3><p>{article.excerpt || article.body.slice(0, 140)}</p><button type="button" onClick={() => onNavigate(null, `/articles/${article.slug}`)}>Read story <Icon name="arrow" size={14} /></button></div></article>
}

function HomePage({ onNavigate }) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [search, setSearch] = useState('')
  const [searchMessage, setSearchMessage] = useState('')
  const [email, setEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [businessOffset, setBusinessOffset] = useState(0)
  useEffect(() => { const timer = window.setInterval(() => setPlaceholderIndex((current) => (current + 1) % heroPlaceholders.length), 4200); return () => window.clearInterval(timer) }, [])
  const homeListings = listings.filter((listing) => listing.isFeatured || listing.isEnhanced)
  const visibleBusinesses = Array.from({ length: 3 }, (_, index) => homeListings[(businessOffset + index) % homeListings.length]).filter(Boolean)
  const cards = discoveryCards.map((item, index) => ({ ...item, title: siteValue(`content.home.discovery_${index + 1}_title`, item.title), description: siteValue(`content.home.discovery_${index + 1}_description`, item.description), action: siteValue(`content.home.discovery_${index + 1}_action`, item.action), image: siteValue(`images.home.discovery_${index + 1}`, item.image) }))
  const goToSearch = (value = '') => { if (value) setSearch(value); document.querySelector('#explore')?.scrollIntoView({ behavior: 'smooth' }); window.setTimeout(() => document.querySelector('#site-search')?.focus(), 450) }
  const handleSearch = (event) => { event.preventDefault(); setSearchMessage(search.trim() ? `Ask UpNorth is exploring “${search.trim()}”` : 'Try a town, lake, stay, restaurant, or event.') }
  const handleSubscribe = async (event) => { event.preventDefault(); if (!email.trim() || !email.includes('@')) { setNewsletterMessage('Please enter a valid email address.'); return }; try { await subscribeToUpNorth(email); setNewsletterMessage('You’re on the list — see you up north.'); setEmail('') } catch { setNewsletterMessage('We could not save that signup right now. Please try again.') } }
  const weekendItems = [{ type: 'Fishing report', title: 'Musky are moving at first light', detail: 'Minocqua chain · Updated today', image: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=850&q=85' }, { type: 'Trail conditions', title: 'Peak color is arriving up north', detail: 'Fall color guide · See the map', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=850&q=85' }, { type: 'Featured event', title: 'Live music by the lake', detail: 'Friday · The Thirsty Giraffe', image: 'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=850&q=85' }, { type: 'Local flavor', title: 'Friday fish fry, done right', detail: 'The Pioneer Bar · Land O’ Lakes', image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=850&q=85' }, { type: 'Stay awhile', title: 'A cabin with a dock and a view', detail: 'Three nights on Big Arbor Vitae', image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=850&q=85' }]
  const sectionOrder = Array.isArray(siteValue('layout.home.sections')) ? siteValue('layout.home.sections') : DEFAULT_SITE_CONFIG['layout.home.sections']
  const sectionMap = {
    hero: <section className="hero" key="hero" style={{ '--hero-image': `url(${siteValue('images.home.hero', heroImage)})` }}><div className="hero-overlay"></div><div className="hero-content"><h1>{siteValue('content.home.hero_title', 'Life’s Better Up North.')}</h1><p className="hero-subtitle">{siteValue('content.home.hero_subtitle', 'Lakes. Forests. Small Towns. Big Memories.')}</p><form className="hero-search" onSubmit={handleSearch} role="search"><Icon name="search" size={18} /><input id="site-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={heroPlaceholders[placeholderIndex]} aria-label="Search Upnorth.org" /><button type="submit">{siteValue('content.home.search_button', 'Search')}</button></form>{searchMessage && <p className="search-message" role="status">{searchMessage}</p>}</div><div className="hero-note" aria-hidden="true"><span>Explore</span><span>Unwind</span><span>Reconnect</span></div><div className="hero-scroll" aria-hidden="true"><span></span></div></section>,
    categories: <section className="category-rail" id="explore" aria-label="Explore categories" key="categories"><div className="category-inner">{categoryLinks.map((category) => <a className="category-item" key={category.label} href={category.href} onClick={(event) => onNavigate(event, category.href)}><span className="category-icon">{category.icon}</span><span>{category.label}</span></a>)}</div></section>,
    discover: <section className="discover-section" id="discover" key="discover"><SectionHeader title={siteValue('content.home.discover_title', 'Discover the Northwoods')} description={siteValue('content.home.discover_description', 'Your guide to everything Up North — from weekend getaways to year-round living.')} /><div className="discovery-grid">{cards.map((item) => <article className="discovery-card" key={item.title}><div className="card-image"><SafeImage src={item.image} alt={item.title} loading="lazy" /></div><div className="card-body"><h3>{item.title}</h3><p>{item.description}</p><button type="button" onClick={() => goToSearch(item.query)}>{item.action} <Icon name="arrow" size={14} /></button></div></article>)}</div></section>,
    events: <section className="events-section" id="events" key="events"><SectionHeader title={siteValue('content.home.events_title', 'Upcoming Events')} description={siteValue('content.home.events_description', 'There’s always something happening up north.')} href="/events" label="See all events" onNavigate={onNavigate} /><div className="horizontal-rail event-rail">{events.slice(0, 7).map((event) => <EventCard event={event} onNavigate={onNavigate} key={event.id} />)}</div></section>,
    towns: <section className="towns-section" id="towns" key="towns"><SectionHeader title={siteValue('content.home.towns_title', 'Popular Towns')} description={siteValue('content.home.towns_description', 'Find your kind of up north.')} href="/explore" label="View all towns" onNavigate={onNavigate} /><div className="town-grid">{towns.slice(0, 4).map((town) => <TownCard town={town} onNavigate={onNavigate} key={town.slug} />)}<a className="town-card town-card-all" href="/explore" onClick={(event) => onNavigate(event, '/explore')}><span><strong>View all towns</strong><small>Minocqua, Mercer, Hurley, Land O’ Lakes and more.</small><Icon name="arrow" size={16} /></span></a></div></section>,
    weekend: <section className="weekend-section" id="weekend" key="weekend"><SectionHeader title={siteValue('content.home.weekend_title', 'This Weekend Up North')} description={siteValue('content.home.weekend_description', 'A few good reasons to get out the door.')} /><div className="weekend-grid">{weekendItems.map((item) => <article className="weekend-card" key={item.title}><SafeImage src={item.image} alt={item.title} loading="lazy" /><div className="weekend-copy"><span>{item.type}</span><h3>{item.title}</h3><p>{item.detail}</p></div></article>)}</div></section>,
    featured: <section className="featured-section" id="featured" key="featured"><div className="featured-heading"><SectionHeader title={siteValue('content.home.featured_title', 'Featured Businesses')} description={siteValue('content.home.featured_description', 'People and places worth knowing.')} left /><div className="rail-controls"><button type="button" disabled={!homeListings.length} onClick={() => setBusinessOffset((businessOffset - 1 + homeListings.length) % homeListings.length)} aria-label="Previous businesses"><Icon name="left" size={17} /></button><button type="button" disabled={!homeListings.length} onClick={() => setBusinessOffset((businessOffset + 1) % homeListings.length)} aria-label="Next businesses"><Icon name="right" size={17} /></button></div></div><div className="business-grid">{visibleBusinesses.map((business) => <article className="business-card" key={business.id}><div className="business-image"><SafeImage src={business.images[0]} alt={business.name} loading="lazy" /><span>Featured</span></div><div className="business-body"><h3>{business.name}</h3><p>{displayTown(business.town)} · {business.subtype}</p><button type="button" onClick={() => onNavigate(null, `/listing/${business.slug}`)}>View listing <Icon name="arrow" size={13} /></button></div></article>)}</div></section>,
    life: <section className="life-section" id="life" key="life"><div className="life-image" style={{ '--life-image': `url(${siteValue('images.home.life', aboutStoryImage)})` }} role="img" aria-label="A campfire beside a Northwoods lake"></div><div className="life-content"><h2>{siteValue('content.home.life_title', 'More Than a Destination.')}<br /><em>{siteValue('content.home.life_emphasis', 'A Way of Life.')}</em></h2><p>{siteValue('content.home.life_body', 'Whether you’re visiting, investing, or making it home, Upnorth.org connects you to the people, places and opportunities that make the Northwoods special.')}</p><button className="outline-button" type="button" onClick={() => goToSearch('living up north')}>{siteValue('content.home.life_cta', 'Learn More About Upnorth.org')} <Icon name="arrow" size={15} /></button></div><div className="newsletter-card" id="newsletter"><div className="newsletter-kicker">{siteValue('content.home.newsletter_title', 'Stay in the Know')}</div><p>{siteValue('content.home.newsletter_body', 'Get the latest events, travel ideas, real estate listings and Northwoods stories.')}</p><form onSubmit={handleSubscribe}><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Your email address" aria-label="Your email address" /><button type="submit">Subscribe</button></form><small>{newsletterMessage || 'No spam. Just Up North content.'}</small></div></section>,
    articles: articles.length ? <section className="events-section" id="articles" key="articles"><SectionHeader title="Latest guides & stories" description="Plain-language Northwoods ideas from the UpNorth.org team." href="/articles" label="See all stories" onNavigate={onNavigate} /><div className="discovery-grid">{articles.slice(0, 4).map((article) => <ArticleCard article={article} onNavigate={onNavigate} key={article.id} />)}</div></section> : null,
  }
  return <main>{sectionOrder.map((key) => sectionMap[key]).filter(Boolean)}</main>
}

function CategoryPage({ category, onNavigate, initialTown }) {
  const [townFilter, setTownFilter] = useState(initialTown || 'all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const header = categoryHeaders[category]
  const isEvents = category === 'events'
  const sourceListings = category === 'explore' ? listings : listings.filter((listing) => listing.category === category)
  const filteredListings = useMemo(() => sourceListings.filter((listing) => (townFilter === 'all' || listing.town === townFilter) && (typeFilter === 'all' || listing.category === typeFilter || listing.subtype === typeFilter)), [sourceListings, townFilter, typeFilter])
  const filteredEvents = useMemo(() => events.filter((event) => (townFilter === 'all' || event.town === townFilter) && (typeFilter === 'all' || event.type === typeFilter)), [townFilter, typeFilter])
  const sortedListings = [...filteredListings].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.isEnhanced) - Number(a.isEnhanced) || a.name.localeCompare(b.name))
  const pagedListings = sortedListings.slice(0, page * 12)
  const pagedEvents = filteredEvents.slice(0, page * 12)
  useEffect(() => setPage(1), [townFilter, typeFilter, category])
  return <main className="route-main"><section className="route-banner" style={{ '--route-image': `url(${header.image})` }}><div className="route-banner-overlay"></div><div className="route-banner-copy"><Breadcrumbs items={[{ label: header.title }]} onNavigate={onNavigate} /><h1>{header.title}</h1><p>{header.description}</p></div></section><section className="route-shell"><FilterBar category={category} townFilter={townFilter} setTownFilter={setTownFilter} typeFilter={typeFilter} setTypeFilter={setTypeFilter} /><SectionHeader title={isEvents ? 'Northwoods calendar' : category === 'explore' ? 'Start exploring' : `${header.title} around the Northwoods`} description={isEvents ? 'Pick a town or a reason to make plans.' : 'Local favorites, practical details, and places worth the drive.'} /><div className={isEvents ? 'event-listing-grid' : 'listing-grid'}>{isEvents ? pagedEvents.map((event) => <EventCard event={event} onNavigate={onNavigate} key={event.id} />) : pagedListings.map((listing) => <ListingCard listing={listing} onNavigate={onNavigate} key={listing.id} />)}</div>{((isEvents && pagedEvents.length < filteredEvents.length) || (!isEvents && pagedListings.length < sortedListings.length)) && <button className="load-more" type="button" onClick={() => setPage((current) => current + 1)}>Load more</button>}</section></main>
}

function TownListingSection({ title, href, listingsForTown, onNavigate }) {
  return <section className="town-list-section"><SectionHeader title={title} href={href} label="See all" onNavigate={onNavigate} left /><div className="listing-grid compact-listing-grid">{listingsForTown.slice(0, 3).map((listing) => <ListingCard listing={listing} onNavigate={onNavigate} key={listing.id} />)}</div>{listingsForTown.length === 0 && <p className="empty-message">No listings here yet. Check back soon.</p>}</section>
}

function TownPage({ slug, onNavigate }) {
  const town = townBySlug[slug]
  if (!town) return <NotFoundPage onNavigate={onNavigate} />
  const townListings = listings.filter((listing) => listing.town === slug)
  const townEvents = events.filter((event) => event.town === slug)
  return <main className="route-main"><section className="route-banner town-banner" style={{ '--route-image': `url(${town.image})` }}><div className="route-banner-overlay"></div><div className="route-banner-copy"><Breadcrumbs items={[{ label: 'Towns', href: '/explore' }, { label: town.name }]} onNavigate={onNavigate} /><h1>{town.name}</h1><p>Explore, stay, eat, and find your way around.</p></div></section><section className="route-shell town-shell"><div className="town-intro-grid"><div className="town-intro"><h2>Welcome to {town.name}</h2><p>{town.intro}</p></div><aside className="quick-facts"><h3>Quick facts</h3><dl><div><dt>Nearest lakes</dt><dd>{town.nearestLakes}</dd></div><div><dt>Known for</dt><dd>{town.knownFor}</dd></div><div><dt>Nearest larger town</dt><dd>{town.nearestLargeTown}</dd></div></dl></aside></div><div className="town-sections"><TownListingSection title="Where to Stay" href={`/stay?town=${town.slug}`} listingsForTown={townListings.filter((listing) => listing.category === 'stay')} onNavigate={onNavigate} /><TownListingSection title="Where to Eat" href={`/eat-drink?town=${town.slug}`} listingsForTown={townListings.filter((listing) => listing.category === 'eat-drink')} onNavigate={onNavigate} /><TownListingSection title="Things to Do" href={`/things-to-do?town=${town.slug}`} listingsForTown={townListings.filter((listing) => listing.category === 'things-to-do')} onNavigate={onNavigate} /><section className="town-list-section"><SectionHeader title="Upcoming Events" href={`/events?town=${town.slug}`} label="See all" onNavigate={onNavigate} left /><div className="event-listing-grid compact-event-grid">{townEvents.slice(0, 3).map((event) => <EventCard event={event} onNavigate={onNavigate} key={event.id} />)}</div>{townEvents.length === 0 && <p className="empty-message">No events posted yet.</p>}</section></div><NorthwoodsMap town={town.slug} label={`${town.name}, Wisconsin`} className="town-map" /><div className="nearby-row"><strong>Nearby towns</strong>{town.nearby.map((nearbySlug) => <a href={`/towns/${nearbySlug}`} onClick={(event) => onNavigate(event, `/towns/${nearbySlug}`)} key={nearbySlug}>{displayTown(nearbySlug)} <Icon name="arrow" size={12} /></a>)}</div></section></main>
}

function ListingDetailPage({ slug, onNavigate }) {
  const listing = listingBySlug[slug]
  const [imageIndex, setImageIndex] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  if (!listing) return <NotFoundPage onNavigate={onNavigate} />
  const nearby = listings.filter((item) => item.town === listing.town && item.slug !== listing.slug).slice(0, 3)
  return <main className="route-main"><section className="route-shell listing-detail-shell"><Breadcrumbs items={[{ label: categoryLabels[listing.category], href: `/${listing.category === 'eat-drink' ? 'eat-drink' : listing.category}` }, { label: listing.name }]} onNavigate={onNavigate} /><div className="gallery-layout"><div className="gallery"><button className="gallery-main" type="button" onClick={() => setLightbox(true)}><SafeImage src={listing.images[imageIndex]} alt={listing.name} /><span>View gallery</span></button><div className="gallery-thumbs">{listing.images.map((source, index) => <button type="button" className={index === imageIndex ? 'is-active' : ''} onClick={() => setImageIndex(index)} key={source}><SafeImage src={source} alt={`${listing.name} gallery ${index + 1}`} /></button>)}</div></div><div className="detail-copy"><div className="detail-kicker">{displayTown(listing.town)} · {listing.subtype}</div><h1>{listing.name}</h1><div className="detail-rating">★ {ratingFor(listing.id)} <span>{listing.priceRange}</span></div><p className="detail-description">{listing.description}</p><dl className="detail-facts">{listing.address && <div><dt>Address</dt><dd>{listing.address}</dd></div>}{listing.phone && <div><dt>Phone</dt><dd>{listing.phone}</dd></div>}<div><dt>Hours</dt><dd>Open daily · Call for current hours</dd></div></dl><div className="detail-actions"><a className="detail-button" href={`/list-your-business?claim=${listing.slug}`} onClick={(event) => onNavigate(event, `/list-your-business?claim=${listing.slug}`)}>Claim this listing</a>{listing.website && <a className="detail-link" href={listing.website} target="_blank" rel="noreferrer">Visit website <Icon name="arrow" size={13} /></a>}</div><div className="listing-tags detail-tags">{listing.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></div></div><NorthwoodsMap town={listing.town} label={`${listing.name} — ${listing.address || displayTown(listing.town)}`} className="detail-map" /><section className="nearby-listings"><SectionHeader title={`Nearby listings in ${displayTown(listing.town)}`} /><div className="listing-grid compact-listing-grid">{nearby.map((item) => <ListingCard listing={item} onNavigate={onNavigate} key={item.id} />)}</div></section></section>{lightbox && <div className="lightbox" role="dialog" aria-modal="true"><button type="button" className="lightbox-close" onClick={() => setLightbox(false)}>Close</button><SafeImage src={listing.images[imageIndex]} alt={listing.name} /></div>}</main>
}

function ArticlesPage({ onNavigate }) {
  return <main className="route-main"><section className="route-banner about-banner" style={{ '--route-image': `url(${siteValue('images.home.life', aboutStoryImage)})` }}><div className="route-banner-overlay"></div><div className="route-banner-copy"><Breadcrumbs items={[{ label: 'Guides & stories' }]} onNavigate={onNavigate} /><h1>Guides &amp; stories</h1><p>Local context, practical trip ideas, and stories from the Northwoods.</p></div></section><section className="route-shell"><SectionHeader title="From Up North" description="Published articles and guides from the UpNorth.org team." />{articles.length ? <div className="discovery-grid">{articles.map((article) => <ArticleCard article={article} onNavigate={onNavigate} key={article.id} />)}</div> : <p className="empty-message">No published stories yet. Check back soon.</p>}</section></main>
}

function ArticleDetailPage({ slug, onNavigate }) {
  const article = articleBySlug[slug]
  if (!article) return <NotFoundPage onNavigate={onNavigate} />
  return <main className="route-main"><section className="route-shell editorial-page-shell"><Breadcrumbs items={[{ label: 'Guides & stories', href: '/articles' }, { label: article.title }]} onNavigate={onNavigate} /><article className="article-detail"><SafeImage src={article.heroImage || fallbackImage} alt={article.title} loading="eager" /><span className="editorial-kicker">Up North guide</span><h1>{article.title}</h1>{article.excerpt && <p className="detail-description">{article.excerpt}</p>}<div className="article-body">{article.body.split(/\n{2,}/).filter(Boolean).map((paragraph, index) => <p key={`${article.id}-${index}`}>{paragraph}</p>)}</div></article></section></main>
}

function AboutPage({ onNavigate }) {
  return <main className="route-main"><section className="route-banner about-banner" style={{ '--route-image': `url(${aboutHeroImage})` }}><div className="route-banner-overlay"></div><div className="route-banner-copy"><Breadcrumbs items={[{ label: 'About Up North' }]} onNavigate={onNavigate} /><h1>More than a destination.</h1><p>A local guide to the lakes, forests, towns, and people that make Up North feel like home.</p></div></section><section className="route-shell editorial-page-shell"><div className="editorial-intro-grid"><div className="editorial-copy"><span className="editorial-kicker">The UpNorth.org story</span><h2>Life is better when there is room to wander.</h2><p>UpNorth.org is a regional discovery guide for the Wisconsin Northwoods and the communities just beyond it. We connect visitors, locals, and future neighbors with the places worth the drive — from a quiet lake cabin and a Friday fish fry to a trailhead, a small-town festival, or a new place to call home.</p><p>Our goal is simple: make it easier to find the good stuff, support local businesses, and leave with a few more Northwoods memories than you arrived with.</p><a className="detail-button" href="/explore" onClick={(event) => onNavigate(event, '/explore')}>Start exploring <Icon name="arrow" size={13} /></a></div><figure className="editorial-photo editorial-photo-tall"><SafeImage src={aboutStoryImage} alt="A Northwoods lake surrounded by pine forest" loading="eager" /><figcaption>Small towns. Clear water. Big memories.</figcaption></figure></div><div className="about-pillars"><article><span>01</span><h3>Local perspective</h3><p>Town-specific context, practical details, and recommendations with a sense of place.</p></article><article><span>02</span><h3>Made for wandering</h3><p>Ideas for quick weekends, long stays, new traditions, and every season in between.</p></article><article><span>03</span><h3>Good for the region</h3><p>A thoughtful platform that helps independent Northwoods businesses get discovered.</p></article></div></section></main>
}

function ContactPage({ onNavigate }) {
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => { event.preventDefault(); setSubmitting(true); setError(''); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); try { await submitContactMessage({ id: `contact-${Date.now()}`, ...values }); setSubmitted(true) } catch { setError('We could not save your message right now. Please try again.') } finally { setSubmitting(false) } }
  return <main className="route-main"><section className="route-banner contact-banner" style={{ '--route-image': `url(${contactHeroImage})` }}><div className="route-banner-overlay"></div><div className="route-banner-copy"><Breadcrumbs items={[{ label: 'Contact' }]} onNavigate={onNavigate} /><h1>Let’s talk Up North.</h1><p>Questions, ideas, local tips, or a business story? We would love to hear from you.</p></div></section><section className="route-shell contact-page-shell"><div className="contact-layout"><aside className="contact-aside"><span className="editorial-kicker">Get in touch</span><h2>Pull up a chair.</h2><p>Whether you are planning a trip, submitting a correction, or looking to put your business on the map, send us a note and the UpNorth.org team will get back to you.</p><div className="contact-details"><div><strong>Email</strong><a href="mailto:hello@upnorth.org">hello@upnorth.org</a></div><div><strong>Business listings</strong><a href="/list-your-business" onClick={(event) => onNavigate(event, '/list-your-business')}>List or claim a business <Icon name="arrow" size={12} /></a></div><div><strong>Northwoods stories</strong><span>Tell us about a place worth knowing.</span></div></div><SafeImage src={contactStoryImage} alt="A quiet cabin beside a Northwoods lake" loading="lazy" /></aside><form className="contact-form" onSubmit={submit}>{submitted ? <div className="contact-success"><span className="confirmation-mark">✓</span><h2>Thanks for reaching out.</h2><p>Your note is ready for the UpNorth.org team. We will be in touch soon.</p><button className="detail-button" type="button" onClick={() => setSubmitted(false)}>Send another note</button></div> : <><div className="p3-section-heading"><h2>Send us a note</h2><p>We read every message.</p></div><div className="contact-form-grid"><label>Name<input required name="name" placeholder="Your name" /></label><label>Email<input required type="email" name="email" placeholder="you@example.com" /></label><label>Topic<select name="topic" defaultValue="general"><option value="general">General question</option><option value="business">Business listing</option><option value="event">Submit an event</option><option value="correction">Suggest a correction</option></select></label><label>Town<input name="town" placeholder="Optional" /></label><label className="form-wide">Message<textarea required name="message" rows="7" placeholder="How can we help?" /></label></div><div className="form-actions"><button className="detail-button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Send message'} <Icon name="arrow" size={13} /></button><small>{error || 'For business listings, you can also use our dedicated submission form.'}</small></div></>}</form></div></section></main>
}

function ClaimPage({ onNavigate }) {
  const params = new URLSearchParams(window.location.search)
  const claim = params.get('claim')
  const listing = claim ? listingBySlug[claim] : null
  return <main className="route-main"><section className="route-shell simple-route-shell"><Breadcrumbs items={[{ label: 'List Your Business' }]} onNavigate={onNavigate} /><div className="simple-route-card"><h1>List Your Business</h1><p>{listing ? `Claim ${listing.name} and keep its Upnorth.org details current.` : 'Put your Northwoods business in front of the people looking for their next stay, meal, and adventure.'}</p><form onSubmit={(event) => event.preventDefault()}><label>Business name<input defaultValue={listing?.name || ''} placeholder="Your business name" /></label><label>Contact email<input type="email" placeholder="you@example.com" /></label><button className="detail-button" type="submit">Start the claim</button></form><small>This is a demo flow for now. The submission step will connect to the business tools in Part 3.</small></div></section></main>
}

function NotFoundPage({ onNavigate }) {
  return <main className="route-main"><section className="route-shell simple-route-shell"><div className="simple-route-card"><h1>That trail isn’t on the map yet.</h1><p>Let’s get you back to the Northwoods.</p><a className="detail-button" href="/" onClick={(event) => onNavigate(event, '/')}>Back to Upnorth.org</a></div></section></main>
}

function RouteView({ route, onNavigate }) {
  const [pathname, query = ''] = route.split('?')
  if (pathname === '/' || pathname === '') return <HomePage onNavigate={onNavigate} />
  if (pathname === '/about') return <AboutPage onNavigate={onNavigate} />
  if (pathname === '/contact') return <ContactPage onNavigate={onNavigate} />
  if (pathname === '/articles') return <ArticlesPage onNavigate={onNavigate} />
  if (pathname.startsWith('/articles/')) return <ArticleDetailPage slug={pathname.split('/')[2]} onNavigate={onNavigate} />
  if (pathname === '/list-your-business') return <ClaimPage onNavigate={onNavigate} />
  if (pathname.startsWith('/towns/')) return <TownPage slug={pathname.split('/')[2]} onNavigate={onNavigate} />
  if (pathname.startsWith('/listing/')) return <ListingDetailPage slug={pathname.split('/')[2]} onNavigate={onNavigate} />
  const category = pathname.replace('/', '')
  if (categoryHeaders[category]) return <CategoryPage category={category} onNavigate={onNavigate} initialTown={new URLSearchParams(query).get('town') || ''} />
  return <NotFoundPage onNavigate={onNavigate} />
}

function App() {
  const [route, setRoute] = useState(`${window.location.pathname}${window.location.search}`)
  const [contentVersion, setContentVersion] = useState(0)
  useEffect(() => { const onPopState = () => setRoute(`${window.location.pathname}${window.location.search}`); window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState) }, [])
  useEffect(() => {
    let active = true
    loadPublicSiteConfig().then((config) => {
      if (!active) return
      siteConfig = config
      applySiteTheme(config)
      setContentVersion((version) => version + 1)
    }).catch((error) => console.warn('Public CMS settings unavailable; using the existing design.', error.message))
    loadPublishedContent().then((content) => {
      if (!active || !content) return
      if (content.events?.length) events = content.events
      if (content.listings?.length) { listings = content.listings; listingBySlug = Object.fromEntries(listings.map((listing) => [listing.slug, listing])) }
      if (content.towns?.length) { towns = content.towns; townBySlug = Object.fromEntries(towns.map((town) => [town.slug, town])) }
      if (content.articles) { articles = content.articles; articleBySlug = Object.fromEntries(articles.map((article) => [article.slug, article])) }
      setContentVersion((version) => version + 1)
    }).catch((error) => console.warn('Supabase content unavailable; using local content.', error.message))
    return () => { active = false }
  }, [])
  const navigate = (event, href) => {
    if (event?.preventDefault) event.preventDefault()
    const url = new URL(href, window.location.origin)
    window.history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`)
    setRoute(`${url.pathname}${url.search}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
    if (url.hash) window.setTimeout(() => document.querySelector(url.hash)?.scrollIntoView({ behavior: 'smooth' }), 40)
  }
  return <div className="site-shell"><SiteHeader onNavigate={navigate} /><RouteView key={contentVersion} route={route} onNavigate={navigate} /><SiteFooter onNavigate={navigate} /></div>
}

createRoot(document.getElementById('root')).render(<App />)

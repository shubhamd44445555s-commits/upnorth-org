import { supabase } from './supabase'

export const DEFAULT_SITE_CONFIG = Object.freeze({
  'content.brand_name': 'UpNorth.org',
  'content.brand_tagline': 'EXPLORE · STAY · DO · BELONG',
  'content.nav.things_to_do': 'Things To Do',
  'content.nav.places_to_stay': 'Places to Stay',
  'content.nav.eat_drink': 'Eat & Drink',
  'content.nav.towns': 'Towns',
  'content.nav.events': 'Events',
  'content.nav.guides': 'Guides',
  'content.nav.real_estate': 'Real Estate',
  'content.nav.more': 'More',
  'content.nav.plan_cta': 'Plan Your Trip',
  'content.footer.about': 'About',
  'content.footer.contact': 'Contact',
  'content.footer.business': 'List Your Business',
  'content.footer.events': 'Submit an Event',
  'content.footer.privacy': 'Privacy',
  'content.footer.tagline': 'The North\nWoods Call',
  'content.home.hero_title': 'Life’s Better Up North.',
  'content.home.hero_subtitle': 'Lakes. Forests. Small Towns. Big Memories.',
  'content.home.search_button': 'Search',
  'content.home.discover_title': 'Discover the Northwoods',
  'content.home.discover_description': 'Your guide to everything Up North — from weekend getaways to year-round living.',
  'content.home.events_title': 'Upcoming Events',
  'content.home.events_description': 'There’s always something happening up north.',
  'content.home.towns_title': 'Popular Towns',
  'content.home.towns_description': 'Find your kind of up north.',
  'content.home.weekend_title': 'This Weekend Up North',
  'content.home.weekend_description': 'A few good reasons to get out the door.',
  'content.home.featured_title': 'Featured Businesses',
  'content.home.featured_description': 'People and places worth knowing.',
  'content.home.life_title': 'More Than a Destination.',
  'content.home.life_emphasis': 'A Way of Life.',
  'content.home.life_body': 'Whether you’re visiting, investing, or making it home, Upnorth.org connects you to the people, places and opportunities that make the Northwoods special.',
  'content.home.life_cta': 'Learn More About Upnorth.org',
  'content.home.newsletter_title': 'Stay in the Know',
  'content.home.newsletter_body': 'Get the latest events, travel ideas, real estate listings and Northwoods stories.',
  'content.home.discovery_1_title': 'Explore the Outdoors',
  'content.home.discovery_1_description': 'Fishing, boating, hiking, snowmobiling and more. Adventure is always in season.',
  'content.home.discovery_1_action': 'See Activities',
  'content.home.discovery_2_title': 'Find a Place to Stay',
  'content.home.discovery_2_description': 'Cabins, resorts, vacation rentals and unique stays across the Northwoods.',
  'content.home.discovery_2_action': 'Browse Stays',
  'content.home.discovery_3_title': 'Great Food & Local Flavor',
  'content.home.discovery_3_description': 'From lakeside bars to fine dining, find your next favorite spot.',
  'content.home.discovery_3_action': 'View Restaurants',
  'content.home.discovery_4_title': 'Charming Towns',
  'content.home.discovery_4_description': 'Discover unique shops, events and friendly communities.',
  'content.home.discovery_4_action': 'Explore Towns',
  'images.home.hero': '/assets/upnorth-hero-autumn-lake.jpg',
  'images.home.life': '/assets/upnorth-life-autumn-woods.jpg',
  'images.home.discovery_1': '/assets/upnorth-outdoors-river.jpg',
  'images.home.discovery_2': 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1000&q=85',
  'images.home.discovery_3': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85',
  'images.home.discovery_4': 'https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=1000&q=85',
  'images.brand.logo': '/upnorth-logo-mark.png',
  'images.brand.logo_dark': '/upnorth-logo-mark.png',
  'images.brand.logo_light': '/upnorth-logo-mark.png',
  'images.brand.favicon': '/upnorth-logo-mark.png',
  'design.color_ink': '#152827',
  'design.color_deep': '#0b2b27',
  'design.color_green': '#0f5143',
  'design.color_pine': '#194a40',
  'design.color_cream': '#f6f5f0',
  'design.color_paper': '#fffefa',
  'design.color_muted': '#66716c',
  'design.color_gold': '#d2ac69',
  'design.font_heading': 'serif',
  'design.font_body': 'sans',
  'design.radius': 0,
  'design.spacing': 1,
  'layout.home.sections': ['hero', 'categories', 'discover', 'events', 'towns', 'weekend', 'featured', 'life', 'articles'],
})

export const CMS_CONTENT_FIELDS = Object.freeze([
  ['content.brand_name', 'Brand name'],
  ['content.brand_tagline', 'Brand tagline'],
  ['content.nav.things_to_do', 'Navigation: Things To Do'],
  ['content.nav.places_to_stay', 'Navigation: Places to Stay'],
  ['content.nav.eat_drink', 'Navigation: Eat & Drink'],
  ['content.nav.towns', 'Navigation: Towns'],
  ['content.nav.events', 'Navigation: Events'],
  ['content.nav.guides', 'Navigation: Guides'],
  ['content.nav.real_estate', 'Navigation: Real Estate'],
  ['content.nav.more', 'Navigation: More'],
  ['content.nav.plan_cta', 'Plan trip button'],
  ['content.footer.about', 'Footer: About'],
  ['content.footer.contact', 'Footer: Contact'],
  ['content.footer.business', 'Footer: List Your Business'],
  ['content.footer.events', 'Footer: Submit an Event'],
  ['content.footer.privacy', 'Footer: Privacy'],
  ['content.home.hero_title', 'Homepage hero title'],
  ['content.home.hero_subtitle', 'Homepage hero subtitle'],
  ['content.home.search_button', 'Search button'],
  ['content.home.discover_title', 'Discover section heading'],
  ['content.home.discover_description', 'Discover section description'],
  ['content.home.events_title', 'Events section heading'],
  ['content.home.events_description', 'Events section description'],
  ['content.home.towns_title', 'Towns section heading'],
  ['content.home.towns_description', 'Towns section description'],
  ['content.home.weekend_title', 'Weekend section heading'],
  ['content.home.weekend_description', 'Weekend section description'],
  ['content.home.featured_title', 'Featured section heading'],
  ['content.home.featured_description', 'Featured section description'],
  ['content.home.life_title', 'Life section heading'],
  ['content.home.life_emphasis', 'Life section emphasized heading'],
  ['content.home.life_body', 'Life section description'],
  ['content.home.life_cta', 'Life section button'],
  ['content.home.newsletter_title', 'Newsletter heading'],
  ['content.home.newsletter_body', 'Newsletter description'],
  ['content.footer.tagline', 'Footer tagline'],
])

export const CMS_IMAGE_FIELDS = Object.freeze([
  ['images.brand.logo_dark', 'Dark logo image URL (light backgrounds)'],
  ['images.brand.logo_light', 'Light logo image URL (dark backgrounds)'],
  ['images.brand.favicon', 'Favicon image URL'],
  ['images.home.hero', 'Homepage hero image URL'],
  ['images.home.life', 'Homepage life section image URL'],
  ['images.home.discovery_1', 'Discovery card 1 image URL'],
  ['images.home.discovery_2', 'Discovery card 2 image URL'],
  ['images.home.discovery_3', 'Discovery card 3 image URL'],
  ['images.home.discovery_4', 'Discovery card 4 image URL'],
])

export const CMS_DESIGN_FIELDS = Object.freeze([
  ['design.color_ink', 'Ink color', 'color'],
  ['design.color_deep', 'Deep green', 'color'],
  ['design.color_green', 'Green', 'color'],
  ['design.color_pine', 'Pine', 'color'],
  ['design.color_cream', 'Cream', 'color'],
  ['design.color_paper', 'Paper', 'color'],
  ['design.color_muted', 'Muted text', 'color'],
  ['design.color_gold', 'Gold accent', 'color'],
  ['design.font_heading', 'Heading font', 'font'],
  ['design.font_body', 'Body font', 'font'],
  ['design.radius', 'Corner roundness', 'number'],
  ['design.spacing', 'Spacing scale', 'number'],
])

export const HOME_SECTION_OPTIONS = Object.freeze([
  ['hero', 'Hero'], ['categories', 'Category rail'], ['discover', 'Discover cards'], ['events', 'Upcoming events'],
  ['towns', 'Popular towns'], ['weekend', 'Weekend ideas'], ['featured', 'Featured businesses'], ['life', 'Life + newsletter'], ['articles', 'Published articles'],
])

export const unwrapSettingValue = (value) => (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value ? value.value : value)

export async function loadPublicSiteConfig() {
  if (!supabase) return { ...DEFAULT_SITE_CONFIG }
  const result = await supabase.from('site_settings').select('key,value').eq('is_public', true)
  if (result.error) throw result.error
  const values = Object.fromEntries((result.data || []).map((entry) => [entry.key, unwrapSettingValue(entry.value)]))
  const config = { ...DEFAULT_SITE_CONFIG, ...values }
  for (const key of Object.keys(DEFAULT_SITE_CONFIG).filter((name) => name.startsWith('images.'))) {
    try {
      const value = String(config[key] || '')
      if (/[\s"'<>]/.test(value)) throw new Error('unsafe image url')
      if (value.startsWith('/')) {
        if (!/^\/(assets\/|upnorth-logo-mark\.png$)/.test(value)) throw new Error('unsafe local image url')
      } else {
        const url = new URL(value)
        if (url.protocol !== 'https:') throw new Error('unsafe image url')
      }
    } catch {
      config[key] = DEFAULT_SITE_CONFIG[key]
    }
  }
  return config
}

export function applySiteBranding(config) {
  if (typeof document === 'undefined') return
  const favicon = String(config['images.brand.favicon'] || DEFAULT_SITE_CONFIG['images.brand.favicon'])
  let link = document.head.querySelector('link[data-upnorth-favicon], link[rel="icon"]')
  if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
  link.dataset.upnorthFavicon = 'true'
  link.href = favicon
}

const safeColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback
const fontMap = { serif: "'Cormorant Garamond', Georgia, serif", sans: "'DM Sans', Arial, sans-serif", system: 'system-ui, sans-serif' }

export function applySiteTheme(config) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const colorMap = { ink: '--ink', deep: '--deep', green: '--green', pine: '--pine', cream: '--cream', paper: '--paper', muted: '--muted', gold: '--gold' }
  for (const [name, cssVar] of Object.entries(colorMap)) root.style.setProperty(cssVar, safeColor(config[`design.color_${name}`], DEFAULT_SITE_CONFIG[`design.color_${name}`]))
  root.style.setProperty('--serif', fontMap[config['design.font_heading']] || fontMap.serif)
  root.style.setProperty('--sans', fontMap[config['design.font_body']] || fontMap.sans)
  const radius = Math.max(0, Math.min(24, Number(config['design.radius']) || 0))
  const spacing = Math.max(0.8, Math.min(1.4, Number(config['design.spacing']) || 1))
  root.style.setProperty('--cms-radius', `${radius}px`)
  root.style.setProperty('--cms-spacing', String(spacing))
}

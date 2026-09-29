const permissionNames = [
  'dashboard.read',
  'businesses.read',
  'businesses.manage',
  'submissions.review',
  'claims.review',
  'towns.manage',
  'events.manage',
  'newsletter.read',
  'contact.read',
  'users.read',
  'admins.manage',
  'ai.read',
  'settings.read',
  'settings.update',
  'site_content.update',
  'media.manage',
  'audit.read',
  'audit.write',
  'security.read',
  'security.manage',
  'categories.manage',
  'articles.manage',
  'newsletter.send',
  'users.manage',
  'ai.update',
]

const allPermissions = Object.freeze(permissionNames)

const PUBLIC_SETTING_PREFIXES = Object.freeze(['content.', 'images.', 'design.', 'layout.'])
const HOME_SECTION_KEYS = Object.freeze(['hero', 'categories', 'discover', 'events', 'towns', 'weekend', 'featured', 'life', 'articles'])

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: allPermissions,
  admin: Object.freeze([
    'dashboard.read', 'businesses.read', 'businesses.manage', 'submissions.review',
    'claims.review', 'towns.manage', 'events.manage', 'newsletter.read', 'contact.read',
    'users.read', 'ai.read', 'settings.read', 'media.manage', 'audit.read', 'audit.write',
    'security.read', 'categories.manage', 'articles.manage', 'newsletter.send',
    'site_content.update',
  ]),
  editor: Object.freeze([
    'dashboard.read', 'businesses.read', 'businesses.manage', 'submissions.review',
    'claims.review', 'towns.manage', 'events.manage', 'media.manage', 'audit.read', 'audit.write',
    'categories.manage', 'articles.manage',
  ]),
  moderator: Object.freeze([
    'dashboard.read', 'businesses.read', 'submissions.review', 'claims.review', 'events.manage',
    'audit.write',
  ]),
  business_manager: Object.freeze([
    'dashboard.read', 'businesses.read', 'businesses.manage', 'submissions.review', 'claims.review',
    'audit.write',
  ]),
  viewer: Object.freeze(['dashboard.read', 'businesses.read']),
  business_owner: Object.freeze([]),
})

export const ADMIN_ACTIONS = Object.freeze([
  'overview',
  'audit_logs',
  'change_history',
  'security_events',
  'users',
  'newsletter_subscribers',
  'contact_messages',
  'system_status',
  'media_list',
  'media_delete',
  'towns',
  'create_town',
  'update_town',
  'delete_town',
  'create_listing',
  'delete_listing',
  'review_submission',
  'review_claim',
  'update_listing',
  'update_event',
  'update_user_role',
  'articles', 'create_article', 'update_article', 'delete_article',
  'categories', 'create_category', 'update_category', 'delete_category',
  'settings', 'update_settings', 'feature_flags', 'update_feature_flag',
  'update_public_site_settings',
  'newsletter_send', 'invite_user', 'set_user_status', 'revoke_user_sessions',
  'ai_settings', 'update_ai_settings',
])

const ACTION_PERMISSIONS = Object.freeze({
  overview: 'dashboard.read',
  audit_logs: 'audit.read',
  change_history: 'audit.read',
  security_events: 'security.read',
  users: 'users.read',
  newsletter_subscribers: 'newsletter.read',
  contact_messages: 'contact.read',
  system_status: 'ai.read',
  media_list: 'media.manage',
  media_delete: 'media.manage',
  towns: 'towns.manage',
  create_town: 'towns.manage',
  update_town: 'towns.manage',
  delete_town: 'towns.manage',
  create_listing: 'businesses.manage',
  delete_listing: 'businesses.manage',
  review_submission: 'submissions.review',
  review_claim: 'claims.review',
  update_listing: 'businesses.manage',
  update_event: 'events.manage',
  update_user_role: 'admins.manage',
  articles: 'articles.manage',
  create_article: 'articles.manage',
  update_article: 'articles.manage',
  delete_article: 'articles.manage',
  categories: 'categories.manage',
  create_category: 'categories.manage',
  update_category: 'categories.manage',
  delete_category: 'categories.manage',
  settings: 'settings.read',
  update_settings: 'settings.update',
  update_public_site_settings: 'site_content.update',
  feature_flags: 'settings.read',
  update_feature_flag: 'settings.update',
  newsletter_send: 'newsletter.send',
  invite_user: 'users.manage',
  set_user_status: 'users.manage',
  revoke_user_sessions: 'users.manage',
  ai_settings: 'ai.read',
  update_ai_settings: 'ai.update',
})

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || []
}

export function canRole(role, permission) {
  return permissionsForRole(role).includes(permission)
}

export function permissionForAction(action) {
  return ACTION_PERMISSIONS[action] || null
}

export function isKnownAction(action) {
  return ADMIN_ACTIONS.includes(action)
}

export function cleanText(value, field, maxLength = 500) {
  if (typeof value !== 'string') throw new Error(`${field} must be text.`)
  const clean = value.trim()
  if (!clean || clean.length > maxLength) throw new Error(`${field} is invalid.`)
  return clean
}

export function cleanOptionalText(value, field, maxLength = 2000) {
  if (value === undefined || value === null || value === '') return null
  return cleanText(value, field, maxLength)
}

export function cleanId(value, field = 'id') {
  const cleaned = cleanText(value, field, 160).replace(/[^a-zA-Z0-9:_-]/g, '')
  if (!cleaned) throw new Error(`${field} is invalid.`)
  return cleaned
}

export function cleanDecision(value) {
  if (value !== 'approve' && value !== 'reject') throw new Error('Decision is invalid.')
  return value
}

export function cleanStatus(value) {
  if (value !== 'draft' && value !== 'published') throw new Error('Status is invalid.')
  return value
}

export function isPublicSiteSettingKey(key) {
  return PUBLIC_SETTING_PREFIXES.some((prefix) => key.startsWith(prefix))
}

function validatePublicSetting(key, value) {
  if (!isPublicSiteSettingKey(key)) return value
  if (key === 'layout.home.sections') {
    if (!Array.isArray(value) || value.length > HOME_SECTION_KEYS.length) throw new Error('Homepage sections are invalid.')
    const sections = value.map((section) => cleanText(section, 'section', 30))
    if (new Set(sections).size !== sections.length || sections.some((section) => !HOME_SECTION_KEYS.includes(section))) throw new Error('Homepage sections are invalid.')
    return sections
  }
  if (key.startsWith('design.color_')) {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Design color is invalid.')
    return value
  }
  if (key === 'design.font_heading' || key === 'design.font_body') {
    if (!['serif', 'sans', 'system'].includes(value)) throw new Error('Design font is invalid.')
    return value
  }
  if (key === 'design.radius') {
    const number = Number(value)
    if (!Number.isFinite(number) || number < 0 || number > 24) throw new Error('Design radius is invalid.')
    return number
  }
  if (key === 'design.spacing') {
    const number = Number(value)
    if (!Number.isFinite(number) || number < 0.8 || number > 1.4) throw new Error('Design spacing is invalid.')
    return number
  }
  if (key.startsWith('images.')) {
    if (typeof value !== 'string' || value.length > 1000 || /[\s"'<>]/.test(value)) throw new Error('Image URL is invalid.')
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:') throw new Error('Image URL is invalid.')
    } catch {
      throw new Error('Image URL is invalid.')
    }
    return value
  }
  if (typeof value !== 'string' || value.length > 2000) throw new Error('Public content is invalid.')
  return value
}

export function validateAdminPayload(action, body = {}) {
  if (!isKnownAction(action)) throw Object.assign(new Error('Admin action is invalid.'), { status: 400 })

  if (action === 'media_delete') return { path: cleanText(body.path, 'path', 500) }
  if (action === 'delete_article' || action === 'delete_category' || action === 'revoke_user_sessions') return { id: cleanId(body.id) }
  if (action === 'set_user_status') {
    const status = cleanText(body.status, 'status', 20)
    if (!['active', 'suspended'].includes(status)) throw new Error('User status is invalid.')
    return { id: cleanId(body.id), status }
  }
  if (action === 'delete_listing' || action === 'delete_town') return { id: cleanId(body.id) }
  if (action === 'create_town') {
    return {
      slug: cleanText(body.slug, 'slug', 90).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      name: cleanText(body.name, 'name', 120),
      image: cleanText(body.image, 'image', 1000),
      intro: cleanText(body.intro, 'intro', 1200),
      nearest_lakes: cleanText(body.nearest_lakes, 'nearest_lakes', 500),
      known_for: cleanText(body.known_for, 'known_for', 500),
      nearest_large_town: cleanText(body.nearest_large_town, 'nearest_large_town', 120),
      nearby: Array.isArray(body.nearby) ? body.nearby.map((item) => cleanText(item, 'nearby', 90)).slice(0, 8) : [],
      status: body.status === 'draft' ? 'draft' : 'published',
    }
  }
  if (action === 'update_town') {
    const id = cleanText(body.id, 'slug', 90)
    const source = body.changes && typeof body.changes === 'object' ? body.changes : {}
    const changes = {}
    for (const field of ['name', 'image', 'intro', 'nearest_lakes', 'known_for', 'nearest_large_town']) {
      if (field in source) changes[field] = cleanText(source[field], field, field === 'intro' ? 1200 : 1000)
    }
    if ('nearby' in source) changes.nearby = Array.isArray(source.nearby) ? source.nearby.map((item) => cleanText(item, 'nearby', 90)).slice(0, 8) : []
    if ('status' in source) changes.status = cleanStatus(source.status)
    if (!Object.keys(changes).length) throw new Error('No allowed town changes supplied.')
    return { id, changes }
  }
  if (action === 'create_listing') {
    const category = cleanText(body.category, 'category', 40)
    if (!['stay', 'eat-drink', 'things-to-do', 'real-estate'].includes(category)) throw new Error('Category is invalid.')
    return {
      id: cleanId(body.id),
      slug: cleanText(body.slug, 'slug', 90).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      name: cleanText(body.name, 'name', 160), category,
      subtype: cleanText(body.subtype, 'subtype', 80), town: cleanText(body.town, 'town', 90),
      price_range: body.price_range ? cleanText(body.price_range, 'price_range', 20) : null,
      tags: Array.isArray(body.tags) ? body.tags.map((item) => cleanText(item, 'tag', 60)).slice(0, 12) : [],
      description: cleanText(body.description, 'description', 2000),
      images: Array.isArray(body.images) ? body.images.map((item) => cleanText(item, 'image', 1000)).slice(0, 8) : [],
      is_featured: Boolean(body.is_featured), is_enhanced: Boolean(body.is_enhanced),
      phone: body.phone ? cleanText(body.phone, 'phone', 50) : null,
      website: body.website ? cleanText(body.website, 'website', 500) : null,
      address: body.address ? cleanText(body.address, 'address', 300) : null,
      status: body.status === 'draft' ? 'draft' : 'published',
    }
  }

  if (action === 'review_submission' || action === 'review_claim') {
    return {
      id: cleanId(body.id),
      decision: cleanDecision(body.decision),
      reviewerNotes: cleanOptionalText(body.reviewerNotes, 'reviewerNotes'),
    }
  }

  if (action === 'update_listing') {
    const id = cleanId(body.id)
    const input = body.changes && typeof body.changes === 'object' ? body.changes : {}
    const changes = {}
    for (const field of ['name', 'slug', 'subtype', 'town', 'description']) {
      if (field in input) changes[field] = cleanText(input[field], field, field === 'description' ? 2000 : 1000)
    }
    for (const field of ['price_range', 'phone', 'website', 'address']) {
      if (field in input) changes[field] = cleanOptionalText(input[field], field, field === 'address' ? 300 : 1000)
    }
    if ('category' in input) {
      changes.category = cleanText(input.category, 'category', 40)
      if (!['stay', 'eat-drink', 'things-to-do', 'real-estate'].includes(changes.category)) throw new Error('Category is invalid.')
    }
    if ('tags' in input) changes.tags = Array.isArray(input.tags) ? input.tags.map((item) => cleanText(item, 'tag', 60)).slice(0, 12) : []
    if ('images' in input) changes.images = Array.isArray(input.images) ? input.images.map((item) => cleanText(item, 'image', 1000)).slice(0, 8) : []
    if ('status' in input) changes.status = cleanStatus(input.status)
    if ('is_featured' in input) changes.is_featured = Boolean(input.is_featured)
    if ('is_enhanced' in input) changes.is_enhanced = Boolean(input.is_enhanced)
    if (!Object.keys(changes).length) throw new Error('No allowed listing changes supplied.')
    return { id, changes }
  }

  if (action === 'update_event') {
    return { id: cleanId(body.id), status: cleanStatus(body.status) }
  }

  if (action === 'update_user_role') {
    const id = cleanId(body.id, 'user id')
    const role = cleanText(body.role, 'role', 40)
    if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)) throw new Error('Role is invalid.')
    return { id, role }
  }

  if (action === 'create_article') {
    return {
      id: cleanId(body.id),
      slug: cleanText(body.slug, 'slug', 120).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      title: cleanText(body.title, 'title', 180),
      excerpt: cleanOptionalText(body.excerpt, 'excerpt', 500),
      body: cleanText(body.body, 'body', 12000),
      hero_image: cleanOptionalText(body.hero_image, 'hero_image', 1000),
      status: body.status === 'published' ? 'published' : 'draft',
      seo_title: cleanOptionalText(body.seo_title, 'seo_title', 180),
      seo_description: cleanOptionalText(body.seo_description, 'seo_description', 320),
    }
  }

  if (action === 'update_article') {
    const id = cleanId(body.id)
    const source = body.changes && typeof body.changes === 'object' ? body.changes : {}
    const changes = {}
    for (const field of ['title', 'body']) if (field in source) changes[field] = cleanText(source[field], field, field === 'body' ? 12000 : 180)
    for (const field of ['excerpt', 'hero_image', 'seo_title', 'seo_description']) if (field in source) changes[field] = cleanOptionalText(source[field], field, field === 'seo_description' ? 320 : 1000)
    if ('status' in source) changes.status = cleanStatus(source.status)
    if ('slug' in source) changes.slug = cleanText(source.slug, 'slug', 120).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if (!Object.keys(changes).length) throw new Error('No allowed article changes supplied.')
    return { id, changes }
  }

  if (action === 'create_category') {
    const kind = cleanText(body.kind, 'kind', 40)
    if (!['listing', 'place', 'real-estate'].includes(kind)) throw new Error('Category kind is invalid.')
    return {
      id: cleanId(body.id),
      slug: cleanText(body.slug, 'slug', 100).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      name: cleanText(body.name, 'name', 120), kind,
      description: cleanOptionalText(body.description, 'description', 500),
      sort_order: Number.isFinite(Number(body.sort_order)) ? Math.max(0, Math.min(9999, Number(body.sort_order))) : 0,
      status: body.status === 'draft' ? 'draft' : 'published',
    }
  }

  if (action === 'update_category') {
    const id = cleanId(body.id)
    const source = body.changes && typeof body.changes === 'object' ? body.changes : {}
    const changes = {}
    for (const field of ['name']) if (field in source) changes[field] = cleanText(source[field], field, 120)
    if ('kind' in source) {
      changes.kind = cleanText(source.kind, 'kind', 40)
      if (!['listing', 'place', 'real-estate'].includes(changes.kind)) throw new Error('Category kind is invalid.')
    }
    if ('description' in source) changes.description = cleanOptionalText(source.description, 'description', 500)
    if ('slug' in source) changes.slug = cleanText(source.slug, 'slug', 100).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
    if ('sort_order' in source) changes.sort_order = Math.max(0, Math.min(9999, Number(source.sort_order) || 0))
    if ('status' in source) changes.status = cleanStatus(source.status)
    if (!Object.keys(changes).length) throw new Error('No allowed category changes supplied.')
    return { id, changes }
  }

  if (action === 'update_settings' || action === 'update_public_site_settings') {
    if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) throw new Error('Settings are invalid.')
    const settings = {}
    for (const [key, value] of Object.entries(body.settings).slice(0, 50)) {
      const safeKey = cleanText(key, 'setting key', 100).toLowerCase().replace(/[^a-z0-9_.-]/g, '-')
      if (action === 'update_public_site_settings' && !isPublicSiteSettingKey(safeKey)) throw new Error('Only public site content settings can be changed.')
      if (Array.isArray(value) || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') settings[safeKey] = validatePublicSetting(safeKey, value)
    }
    return { settings }
  }

  if (action === 'update_feature_flag') return { key: cleanText(body.key, 'key', 100), enabled: Boolean(body.enabled) }

  if (action === 'newsletter_send') return { subject: cleanText(body.subject, 'subject', 180), text: cleanText(body.text, 'text', 10000) }

  if (action === 'invite_user') {
    const email = cleanText(body.email, 'email', 320).toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Email is invalid.')
    const role = cleanText(body.role || 'business_owner', 'role', 40)
    if (!Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role) || role === 'super_admin') throw new Error('Invite role is invalid.')
    return { email, role }
  }

  if (action === 'update_ai_settings') {
    const settings = body.settings && typeof body.settings === 'object' ? body.settings : {}
    return { settings: { enabled: Boolean(settings.enabled), model: cleanOptionalText(settings.model, 'model', 120), system_prompt: cleanOptionalText(settings.system_prompt, 'system_prompt', 2000), monthly_limit: Math.max(0, Math.min(100000, Number(settings.monthly_limit) || 0)) } }
  }

  return {}
}

// If the hosting provider treats this helper as an API function, never expose its internals.
export default function handler(_req, res) {
  res.status(404).json({ error: 'Not found.' })
}

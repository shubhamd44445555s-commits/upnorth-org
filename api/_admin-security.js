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
  'media.manage',
  'audit.read',
  'audit.write',
  'security.read',
  'security.manage',
]

const allPermissions = Object.freeze(permissionNames)

export const ROLE_PERMISSIONS = Object.freeze({
  super_admin: allPermissions,
  admin: Object.freeze([
    'dashboard.read', 'businesses.read', 'businesses.manage', 'submissions.review',
    'claims.review', 'towns.manage', 'events.manage', 'newsletter.read', 'contact.read',
    'users.read', 'ai.read', 'settings.read', 'media.manage', 'audit.read', 'audit.write',
    'security.read',
  ]),
  editor: Object.freeze([
    'dashboard.read', 'businesses.read', 'businesses.manage', 'submissions.review',
    'claims.review', 'towns.manage', 'events.manage', 'media.manage', 'audit.read', 'audit.write',
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
  'security_events',
  'users',
  'review_submission',
  'review_claim',
  'update_listing',
  'update_event',
  'update_user_role',
])

const ACTION_PERMISSIONS = Object.freeze({
  overview: 'dashboard.read',
  audit_logs: 'audit.read',
  security_events: 'security.read',
  users: 'users.read',
  review_submission: 'submissions.review',
  review_claim: 'claims.review',
  update_listing: 'businesses.manage',
  update_event: 'events.manage',
  update_user_role: 'admins.manage',
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

export function validateAdminPayload(action, body = {}) {
  if (!isKnownAction(action)) throw new Error('Admin action is invalid.')

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

  return {}
}

// If the hosting provider treats this helper as an API function, never expose its internals.
export default function handler(_req, res) {
  res.status(404).json({ error: 'Not found.' })
}

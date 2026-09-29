import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import {
  canRole,
  isKnownAction,
  validateAdminPayload,
} from '../lib/admin-security.js'

assert.equal(canRole('super_admin', 'admins.manage'), true)
assert.equal(canRole('admin', 'admins.manage'), false)
assert.equal(canRole('editor', 'businesses.manage'), true)
assert.equal(canRole('business_owner', 'dashboard.read'), false)
assert.equal(isKnownAction('update_listing'), true)
assert.equal(isKnownAction('delete_everything'), false)

const safeListingUpdate = validateAdminPayload('update_listing', {
  id: 'listing-1',
  role: 'super_admin',
  changes: { status: 'published', is_featured: true, role: 'super_admin', subscriptionStatus: 'paid' },
})
assert.deepEqual(safeListingUpdate, { id: 'listing-1', changes: { status: 'published', is_featured: true } })

assert.throws(() => validateAdminPayload('update_user_role', { id: 'user-1', role: 'root' }), /Role is invalid/)
assert.throws(() => validateAdminPayload('update_listing', { id: 'listing-1', changes: { role: 'super_admin' } }), /No allowed listing changes/)
assert.throws(() => validateAdminPayload('review_submission', { id: '', decision: 'approve' }), /id is invalid/)

const apiSource = await readFile(new URL('../api/admin.js', import.meta.url), 'utf8')
assert.match(apiSource, /auth\.getUser/)
assert.match(apiSource, /validateAdminPayload/)
assert.match(apiSource, /canRole/)
assert.match(apiSource, /enforceSameOrigin/)
// A service-role key may be read by a server-only function for provider actions,
// but it must never be in browser code or a public environment variable.
assert.doesNotMatch(apiSource, /(?:VITE|NEXT_PUBLIC)_SUPABASE_SERVICE_ROLE_KEY/)
const browserSource = await readFile(new URL('../src/admin-panel-secure.jsx', import.meta.url), 'utf8')
assert.doesNotMatch(browserSource, /SUPABASE_SERVICE_ROLE_KEY/)

console.log('Admin security tests passed.')

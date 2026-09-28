import { adminRequest } from './admin-api'

export async function loadAdminData() {
  const result = await adminRequest('overview')
  return { ...result.data, actor: result.actor }
}

export async function reviewBusinessSubmission(submission, decision, actorId, reviewerNotes = '') {
  await adminRequest('review_submission', { id: submission.id, decision, reviewerNotes })
}

export async function reviewClaim(claim, decision, actorId, reviewerNotes = '') {
  await adminRequest('review_claim', { id: claim.id, decision, reviewerNotes })
}

export async function updateListingFlags(listing, flags, actorId) {
  await adminRequest('update_listing', { id: listing.id, changes: flags })
}

export async function updateEventStatus(event, status) {
  await adminRequest('update_event', { id: event.id, status })
}

export async function loadAuditLogs() {
  const result = await adminRequest('audit_logs')
  return result.logs || []
}

export async function loadSecurityEvents() {
  const result = await adminRequest('security_events')
  return result.events || []
}

export async function loadAdminUsers() {
  const result = await adminRequest('users')
  return result.users || []
}

export async function updateAdminRole(id, role) {
  await adminRequest('update_user_role', { id, role })
}

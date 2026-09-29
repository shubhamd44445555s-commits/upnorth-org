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

export async function loadChangeHistory() {
  const result = await adminRequest('change_history')
  return result.history || []
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

export async function createListing(payload) {
  await adminRequest('create_listing', payload)
}

export async function deleteListing(id) {
  await adminRequest('delete_listing', { id })
}

export async function loadTowns() {
  const result = await adminRequest('towns')
  return result.towns || []
}

export async function createTown(payload) {
  await adminRequest('create_town', payload)
}

export async function updateTown(id, changes) {
  await adminRequest('update_town', { id, changes })
}

export async function deleteTown(id) {
  await adminRequest('delete_town', { id })
}

export async function loadNewsletterSubscribers() {
  const result = await adminRequest('newsletter_subscribers')
  return result.subscribers || []
}

export async function loadContactMessages() {
  const result = await adminRequest('contact_messages')
  return result.messages || []
}

export async function loadSystemStatus() {
  const result = await adminRequest('system_status')
  return result.status || {}
}

export async function loadMedia() {
  const result = await adminRequest('media_list')
  return result.media || []
}

export async function deleteMedia(path) {
  await adminRequest('media_delete', { path })
}

export async function loadArticles() {
  const result = await adminRequest('articles')
  return result.articles || []
}

export async function createArticle(payload) {
  await adminRequest('create_article', payload)
}

export async function updateArticle(id, changes) {
  await adminRequest('update_article', { id, changes })
}

export async function deleteArticle(id) {
  await adminRequest('delete_article', { id })
}

export async function loadCategories() {
  const result = await adminRequest('categories')
  return result.categories || []
}

export async function createCategory(payload) {
  await adminRequest('create_category', payload)
}

export async function updateCategory(id, changes) {
  await adminRequest('update_category', { id, changes })
}

export async function deleteCategory(id) {
  await adminRequest('delete_category', { id })
}

export async function loadSiteSettings() {
  const result = await adminRequest('settings')
  return result.settings || []
}

export async function updateSiteSettings(settings) {
  await adminRequest('update_settings', { settings })
}

export async function updatePublicSiteSettings(settings) {
  await adminRequest('update_public_site_settings', { settings })
}

export async function loadFeatureFlags() {
  const result = await adminRequest('feature_flags')
  return result.flags || []
}

export async function updateFeatureFlag(key, enabled) {
  await adminRequest('update_feature_flag', { key, enabled })
}

export async function sendNewsletter(subject, text) {
  return adminRequest('newsletter_send', { subject, text })
}

export async function inviteAdminUser(email, role) {
  await adminRequest('invite_user', { email, role })
}

export async function suspendAdminUser(id) {
  await adminRequest('set_user_status', { id, status: 'suspended' })
}

export async function setAdminUserStatus(id, status) {
  await adminRequest('set_user_status', { id, status })
}

export async function revokeAdminUserSessions(id) {
  await adminRequest('revoke_user_sessions', { id })
}

export async function loadAiSettings() {
  const result = await adminRequest('ai_settings')
  return result.settings || {}
}

export async function updateAiSettings(settings) {
  await adminRequest('update_ai_settings', { settings })
}

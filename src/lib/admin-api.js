import { supabase } from './supabase'

export async function adminRequest(action, payload = {}) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError || !sessionData.session?.access_token) throw new Error('Your admin session has expired. Please sign in again.')

  const response = await fetch('/api/admin', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  })

  let result = {}
  try { result = await response.json() } catch { result = {} }
  if (!response.ok) {
    if (response.status === 401) throw new Error('Your admin session has expired. Please sign in again.')
    if (response.status === 403) throw new Error('You do not have permission for this action.')
    throw new Error(result.error || 'The admin request could not be completed.')
  }
  return result
}

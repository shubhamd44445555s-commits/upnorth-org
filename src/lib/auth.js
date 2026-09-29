import { supabase } from './supabase'

export async function signInWithPassword(email, password) {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('profiles').select('id,email,role,status').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export function isAdminProfile(profile) {
  return profile?.status !== 'suspended' && ['super_admin', 'admin', 'editor', 'moderator', 'business_manager', 'viewer'].includes(profile?.role)
}

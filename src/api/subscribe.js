import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'upnorth-newsletter-signups'

export async function subscribeToUpNorth(email) {
  const cleanEmail = email.trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.')

  try {
    const response = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: cleanEmail }) })
    if (response.ok) return await response.json()
  } catch {
    // Local Vite development does not execute Vercel API functions.
  }

  if (supabase) {
    const { error } = await supabase.from('newsletter_subscribers').upsert({ email: cleanEmail }, { onConflict: 'email', ignoreDuplicates: true })
    if (error) throw error
    return { ok: true, message: 'You’re on the list — see you up north.' }
  }

  const existing = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
  if (!existing.includes(cleanEmail)) window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing, cleanEmail]))
  return { ok: true, message: 'You’re on the list — see you up north.' }
}

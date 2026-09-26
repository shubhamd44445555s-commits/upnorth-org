import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

async function persistSubscriber(email) {
  if (!supabaseUrl || !supabaseKey) return
  const client = createClient(supabaseUrl, supabaseKey)
  const { error } = await client.from('newsletter_subscribers').upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
  if (error) throw error
}

async function syncProvider(email) {
  const provider = process.env.NEWSLETTER_PROVIDER?.toLowerCase()
  const apiKey = process.env.NEWSLETTER_API_KEY
  if (!provider || !apiKey) return

  if (provider === 'brevo') {
    const listId = Number(process.env.BREVO_LIST_ID)
    if (!listId) throw new Error('BREVO_LIST_ID is missing.')
    const response = await fetch('https://api.brevo.com/v3/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json', 'api-key': apiKey }, body: JSON.stringify({ email, listIds: [listId], updateEnabled: true }) })
    if (!response.ok && response.status !== 204) throw new Error(`Brevo returned ${response.status}`)
    return
  }

  if (provider === 'mailchimp') {
    const audienceId = process.env.MAILCHIMP_AUDIENCE_ID
    const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX
    if (!audienceId || !serverPrefix) throw new Error('Mailchimp audience or server prefix is missing.')
    const hash = createHash('md5').update(email).digest('hex')
    const response = await fetch(`https://${serverPrefix}.api.mailchimp.com/3.0/lists/${audienceId}/members/${hash}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`any:${apiKey}`).toString('base64')}` }, body: JSON.stringify({ email_address: email, status_if_new: 'pending' }) })
    if (!response.ok) throw new Error(`Mailchimp returned ${response.status}`)
  }
}

export default async function handler(request, response) {
  if (request.method !== 'POST') return response.status(405).json({ error: 'Method not allowed' })
  const email = String(request.body?.email || '').trim().toLowerCase()
  if (!email || !email.includes('@')) return response.status(400).json({ error: 'Please enter a valid email address.' })
  try {
    await persistSubscriber(email)
    await syncProvider(email)
    return response.status(200).json({ ok: true, message: 'You’re on the list — see you up north.' })
  } catch (error) {
    console.error('Newsletter subscription failed:', error.message)
    return response.status(500).json({ error: 'We could not save that signup right now.' })
  }
}

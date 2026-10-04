export async function syncCrmEvent(eventType, payload = {}) {
  const webhook = process.env.CRM_WEBHOOK_URL
  if (!webhook) return { configured: false, sent: false }
  try {
    const result = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-UpNorth-Event': eventType },
      body: JSON.stringify({ source: 'upnorth.org', event: eventType, payload }),
    })
    if (!result.ok) { console.error('CRM webhook failed:', result.status); return { configured: true, sent: false } }
    return { configured: true, sent: true }
  } catch (error) {
    console.error('CRM webhook failed:', error?.message || 'unknown error')
    return { configured: true, sent: false }
  }
}

const channelEnv = {
  leads: 'SLACK_WEBHOOK_LEADS',
  content: 'SLACK_WEBHOOK_CONTENT',
  security: 'SLACK_WEBHOOK_SECURITY',
}

function channelFor(eventType) {
  if (/submission|claim|contact|newsletter/i.test(eventType)) return 'leads'
  if (/security|login|permission/i.test(eventType)) return 'security'
  return 'content'
}

function safeDetails(details) {
  return Object.entries(details || {}).slice(0, 12).map(([key, value]) => `${key}: ${String(value ?? '').slice(0, 300)}`).join('\n')
}

export async function notifySlack(eventType, details = {}) {
  const channel = channelFor(eventType)
  const webhook = process.env[channelEnv[channel]] || process.env.SLACK_WEBHOOK_URL
  if (!webhook) return { configured: false, sent: false }
  try {
    const result = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `UpNorth.org · ${eventType}\n${safeDetails(details)}`,
        username: 'UpNorth Admin',
        mrkdwn: false,
      }),
    })
    if (!result.ok) { console.error('Slack notification failed:', result.status); return { configured: true, sent: false } }
    return { configured: true, sent: true, channel }
  } catch (error) {
    console.error('Slack notification failed:', error?.message || 'unknown error')
    return { configured: true, sent: false }
  }
}

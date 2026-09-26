import crypto from 'node:crypto'

const RESEND_API_BASE = 'https://api.resend.com'
const DYNADOT_API_BASE = process.env.DYNADOT_API_BASE_URL || 'https://api.dynadot.com'
const domain = (process.env.RESEND_DOMAIN || '').trim().toLowerCase()
const resendApiKey = process.env.RESEND_API_KEY
const dynadotApiKey = process.env.DYNADOT_API_KEY
const dynadotApiSecret = process.env.DYNADOT_API_SECRET
const shouldApply = process.argv.includes('--apply')
const hasConfirmation = process.env.RESEND_SETUP_CONFIRM === 'YES'

function fail(message) {
  console.error(`\nSetup stopped: ${message}`)
  process.exitCode = 1
}

function requireEnvironment() {
  const missing = []
  if (!domain) missing.push('RESEND_DOMAIN')
  if (!resendApiKey) missing.push('RESEND_API_KEY')
  if (shouldApply && !dynadotApiKey) missing.push('DYNADOT_API_KEY')
  if (shouldApply && !dynadotApiSecret) missing.push('DYNADOT_API_SECRET')

  if (missing.length) {
    fail(`add these server-only variables to .env.local first: ${missing.join(', ')}`)
    return false
  }

  if (shouldApply && !hasConfirmation) {
    fail('live DNS changes require RESEND_SETUP_CONFIRM=YES in addition to --apply')
    return false
  }

  return true
}

async function readResponse(response, label) {
  const text = await response.text()
  let body = {}
  try {
    body = text ? JSON.parse(text) : {}
  } catch {
    body = { raw: text }
  }

  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${JSON.stringify(body)}`)
  }

  return body
}

async function resendRequest(path, options = {}) {
  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  return readResponse(response, `Resend ${options.method || 'GET'} ${path}`)
}

function createDynadotSignature(path, requestId, body) {
  const stringToSign = [dynadotApiKey, path, requestId, body].join('\n')
  return crypto
    .createHmac('sha256', Buffer.from(dynadotApiSecret, 'utf8'))
    .update(Buffer.from(stringToSign, 'utf8'))
    .digest('base64')
}

async function dynadotRequest(path, body) {
  const requestId = crypto.randomUUID()
  const requestBody = JSON.stringify(body)
  const response = await fetch(`${DYNADOT_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${dynadotApiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
      'X-Signature': createDynadotSignature(path, requestId, requestBody),
    },
    body: requestBody,
  })
  return readResponse(response, `Dynadot POST ${path}`)
}

function getDomainName(record) {
  return String(record.name || record.record || record.host || '').replace(/\.$/, '').toLowerCase()
}

function getRelativeHost(record) {
  const recordName = getDomainName(record)
  if (!recordName || recordName === '@' || recordName === domain) return ''
  const suffix = `.${domain}`
  return recordName.endsWith(suffix) ? recordName.slice(0, -suffix.length) : recordName
}

function normalizeResendRecords(domainData) {
  const records = Array.isArray(domainData?.records) ? domainData.records : []
  return records
    .map((record) => {
      const type = String(record.type || record.record_type || '').toLowerCase()
      const value = String(record.value ?? record.record_value1 ?? '').trim()
      const priority = record.priority ?? record.record_value2
      return {
        name: getDomainName(record),
        host: getRelativeHost(record),
        type,
        value,
        priority: priority === undefined || priority === null ? '' : String(priority),
      }
    })
    .filter((record) => record.type && record.value)
}

function toDynadotRecord(record) {
  const item = {
    record_type: record.type,
    record_value1: record.value,
  }

  if (record.type === 'mx') item.record_value2 = record.priority || '10'
  return item
}

async function getOrCreateResendDomain() {
  const list = await resendRequest('/domains')
  const existing = (list.data || []).find((item) => String(item.name).toLowerCase() === domain)

  if (existing) {
    console.log(`\nResend domain already exists: ${existing.name} (${existing.status})`)
    return existing
  }

  if (!shouldApply) {
    console.log(`\nDry run: Resend domain ${domain} would be created.`)
    return null
  }

  const created = await resendRequest('/domains', {
    method: 'POST',
    body: JSON.stringify({ name: domain }),
  })
  console.log(`\nCreated Resend domain: ${created.data?.name || domain}`)
  return created.data
}

async function loadResendDomain(domainData) {
  if (!domainData?.id) return domainData
  const response = await resendRequest(`/domains/${domainData.id}`)
  return response.data || response
}

async function addDynadotRecords(records) {
  const path = `/restful/v2/domains/${encodeURIComponent(domain)}/records`

  for (const record of records) {
    const item = toDynadotRecord(record)
    const body = record.host
      ? { dns_sub_list: [{ sub_host: record.host, ...item }] }
      : { dns_main_list: [item] }

    console.log(`Adding Dynadot ${record.type.toUpperCase()} ${record.name || domain}`)
    await dynadotRequest(path, body)
  }
}

async function verifyResendDomain(domainData) {
  if (!domainData?.id || !shouldApply) return

  await resendRequest(`/domains/${domainData.id}/verify`, { method: 'POST' })
  const current = await loadResendDomain(domainData)
  console.log(`\nResend status after verification request: ${current.status || 'pending'}`)
  if (current.status !== 'verified') {
    console.log('DNS propagation may take a while. Run this script again later with --apply to retry verification.')
  }
}

async function main() {
  if (!requireEnvironment()) return

  console.log(`UpNorth Resend + Dynadot setup for ${domain}`)
  if (!shouldApply) {
    console.log('Mode: dry run (no domain or DNS changes will be made)')
  } else {
    console.log('Mode: APPLY — live DNS changes are enabled')
  }

  const domainData = await getOrCreateResendDomain()
  if (!domainData) {
    console.log('\nAdd --apply and RESEND_SETUP_CONFIRM=YES to create the Resend domain and continue.')
    return
  }

  const currentDomain = await loadResendDomain(domainData)
  if (currentDomain.status === 'verified') {
    console.log('\nResend already reports this domain as verified. No DNS changes are needed.')
    return
  }

  const records = normalizeResendRecords(currentDomain)
  if (!records.length) {
    throw new Error('Resend returned no DNS records. Check the domain response in the Resend dashboard.')
  }

  console.log('\nDNS records required by Resend:')
  for (const record of records) {
    const priority = record.priority ? ` priority=${record.priority}` : ''
    console.log(`- ${record.type.toUpperCase()} ${record.name || domain} → ${record.value}${priority}`)
  }

  if (!shouldApply) {
    console.log('\nDry run complete. No Dynadot records were changed.')
    return
  }

  await addDynadotRecords(records)
  await verifyResendDomain(currentDomain)
  console.log('\nSetup complete. Check the Resend dashboard for final verification status.')
}

main().catch((error) => fail(error.message))

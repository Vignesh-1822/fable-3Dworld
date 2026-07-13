import { generateWorld } from './generateWorld.mjs'

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'

// Per-instance token bucket: refills 1 request per 3s, burst of 10. Lambda
// scales instances under real load, so this is abuse damping (protecting the
// Anthropic credit balance), not precise per-user limiting.
const bucket = { tokens: 10, lastRefill: Date.now() }
function takeToken() {
  const now = Date.now()
  bucket.tokens = Math.min(10, bucket.tokens + (now - bucket.lastRefill) / 3000)
  bucket.lastRefill = now
  if (bucket.tokens < 1) return false
  bucket.tokens -= 1
  return true
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
}

function respond(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

/** AWS Lambda Function URL handler: POST { prompt } → WorldParams JSON. */
export async function handler(event) {
  const method = event.requestContext?.http?.method
  if (method === 'OPTIONS') return respond(204, {})
  if (method !== 'POST') return respond(405, { error: 'POST only' })

  if (!takeToken()) {
    return respond(429, { error: 'Too many requests — try again in a few seconds.' })
  }

  let prompt
  try {
    prompt = JSON.parse(event.body ?? '{}').prompt
  } catch {
    return respond(400, { error: 'Body must be JSON: { "prompt": "..." }' })
  }

  try {
    const params = await generateWorld(prompt)
    return respond(200, params)
  } catch (err) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 502
    const message = statusCode >= 500 ? 'World generation failed — try again.' : err.message
    if (statusCode >= 500) console.error('generateWorld failed:', err)
    return respond(statusCode, { error: message })
  }
}

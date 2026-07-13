/**
 * Local stand-in for the Lambda Function URL: `node dev-server.mjs` → POST
 * http://localhost:8787/generate. With no OPENAI_API_KEY set it runs in
 * mock mode, returning deterministic canned params so the frontend can be
 * developed without spending credits.
 */
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Load lambda/.env if present (copy .env.example and add your key there)
try {
  process.loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), '.env'))
} catch {
  // no .env file — fall back to whatever is already in the environment
}

const PORT = Number(process.env.PORT ?? 8787)
const MOCK = !process.env.OPENAI_API_KEY

function mockWorld(prompt) {
  // Cheap deterministic hash so different prompts give different worlds
  let hash = 0
  for (const ch of prompt) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const unit = (offset) => (((hash >>> offset) & 0xff) / 255) * 0.8 + 0.1
  return {
    seed: (hash % 2147483646) + 1,
    terrain: {
      amplitude: 150 + unit(0) * 300,
      frequency: 0.8 + unit(2) * 1.8,
      octaves: 5,
      ridgeWeight: unit(4),
      warpStrength: unit(6) * 1.5,
      waterLevel: 0.08 + unit(8) * 0.3,
    },
    climate: { temperature: unit(10), moisture: unit(12) },
    atmosphere: { timeOfDay: unit(14) * 24, fogDensity: unit(16), cloudCover: unit(18) },
  }
}

const server = createServer(async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    return res.end()
  }
  if (req.method !== 'POST') {
    res.writeHead(405, headers)
    return res.end(JSON.stringify({ error: 'POST only' }))
  }

  let body = ''
  for await (const chunk of req) body += chunk

  let prompt
  try {
    prompt = JSON.parse(body).prompt
  } catch {
    res.writeHead(400, headers)
    return res.end(JSON.stringify({ error: 'Body must be JSON: { "prompt": "..." }' }))
  }

  if (MOCK) {
    console.log(`[mock] ${prompt}`)
    res.writeHead(200, headers)
    return res.end(JSON.stringify(mockWorld(String(prompt ?? ''))))
  }

  try {
    const { generateWorld } = await import('./generateWorld.mjs')
    const params = await generateWorld(prompt)
    res.writeHead(200, headers)
    res.end(JSON.stringify(params))
  } catch (err) {
    const statusCode = typeof err?.statusCode === 'number' ? err.statusCode : 502
    console.error('generateWorld failed:', err)
    res.writeHead(statusCode, headers)
    res.end(JSON.stringify({ error: err.message ?? 'World generation failed' }))
  }
})

server.listen(PORT, () => {
  console.log(`worldseed dev API on http://localhost:${PORT} (${MOCK ? 'MOCK mode — set OPENAI_API_KEY for real generations' : 'live mode'})`)
})

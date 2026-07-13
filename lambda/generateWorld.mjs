import OpenAI from 'openai'
import { SYSTEM_PROMPT, WORLD_PARAMS_SCHEMA } from './worldParamsSchema.mjs'

const MODEL = process.env.MODEL_ID ?? 'gpt-4o-mini'
const MAX_PROMPT_CHARS = 400

const client = new OpenAI() // reads OPENAI_API_KEY from the environment

/**
 * Core prompt → WorldParams translation, shared by the Lambda handler and the
 * local dev server. Throws { statusCode, message } on user/upstream errors.
 * Uses OpenAI structured outputs (strict json_schema) so the reply is
 * guaranteed to match WORLD_PARAMS_SCHEMA; the frontend still re-clamps.
 */
export async function generateWorld(prompt) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw { statusCode: 400, message: 'prompt must be a non-empty string' }
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw { statusCode: 400, message: `prompt too long (max ${MAX_PROMPT_CHARS} chars)` }
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 1000,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `World description: ${prompt.trim()}` },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'world_params', strict: true, schema: WORLD_PARAMS_SCHEMA },
    },
  })

  const message = response.choices[0]?.message
  if (message?.refusal) {
    throw { statusCode: 422, message: 'The model declined this description — try rephrasing it.' }
  }
  if (!message?.content) {
    throw { statusCode: 502, message: 'Model returned no content' }
  }

  // Guaranteed schema-valid JSON by strict structured outputs; parse defensively anyway
  try {
    return JSON.parse(message.content)
  } catch {
    throw { statusCode: 502, message: 'Model returned unparseable JSON' }
  }
}

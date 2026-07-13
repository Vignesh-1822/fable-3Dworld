import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, WORLD_PARAMS_SCHEMA } from './worldParamsSchema.mjs'

const MODEL = process.env.MODEL_ID ?? 'claude-opus-4-8'
const MAX_PROMPT_CHARS = 400

const client = new Anthropic() // reads ANTHROPIC_API_KEY from the environment

/**
 * Core prompt → WorldParams translation, shared by the Lambda handler and the
 * local dev server. Throws { statusCode, message } on user/upstream errors.
 */
export async function generateWorld(prompt) {
  if (typeof prompt !== 'string' || prompt.trim().length === 0) {
    throw { statusCode: 400, message: 'prompt must be a non-empty string' }
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    throw { statusCode: 400, message: `prompt too long (max ${MAX_PROMPT_CHARS} chars)` }
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    output_config: {
      format: { type: 'json_schema', schema: WORLD_PARAMS_SCHEMA },
    },
    messages: [{ role: 'user', content: `World description: ${prompt.trim()}` }],
  })

  if (response.stop_reason === 'refusal') {
    throw { statusCode: 422, message: 'The model declined this description — try rephrasing it.' }
  }

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock) {
    throw { statusCode: 502, message: 'Model returned no content' }
  }

  // Guaranteed schema-valid JSON by structured outputs; parse defensively anyway
  try {
    return JSON.parse(textBlock.text)
  } catch {
    throw { statusCode: 502, message: 'Model returned unparseable JSON' }
  }
}

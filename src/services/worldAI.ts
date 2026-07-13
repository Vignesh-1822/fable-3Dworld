import { apiFetch } from './apiFetch'
import { clampWorldParams } from '@/lib/worldSchema'
import type { WorldParams } from '@/types/world'

/** Generates WorldParams from a natural-language prompt via the AI backend, sanitized through clampWorldParams. */
export async function generateWorldParams(prompt: string): Promise<WorldParams> {
  const result = await apiFetch<unknown>('/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
  return clampWorldParams(result)
}

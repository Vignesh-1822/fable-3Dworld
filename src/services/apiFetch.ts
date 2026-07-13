const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

interface ApiErrorBody {
  error?: unknown
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.clone().json()) as ApiErrorBody
    if (typeof body.error === 'string' && body.error.length > 0) {
      return body.error
    }
  } catch {
    // Response body wasn't JSON (or had no `error` field) — fall through to the generic message.
  }
  return `API error: ${res.status} ${res.statusText}`
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    throw new Error(await extractErrorMessage(res))
  }

  return res.json() as Promise<T>
}

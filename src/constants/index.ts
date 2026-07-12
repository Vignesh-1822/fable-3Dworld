export const APP_NAME = 'Worldseed'

export const ROUTES = {
  HOME: '/',
} as const

export const QUERY_KEYS = {
  GENERATE_WORLD: (prompt: string) => ['generate-world', prompt] as const,
}

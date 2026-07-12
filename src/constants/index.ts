import type { WorldParams } from '@/types/world'

export const APP_NAME = 'Worldseed'

export const DEFAULT_WORLD_PARAMS: WorldParams = {
  seed: 1337,
  terrain: {
    amplitude: 320,
    frequency: 1.4,
    octaves: 6,
    ridgeWeight: 0.6,
    warpStrength: 0.8,
    waterLevel: 0.18,
  },
}

export const ROUTES = {
  HOME: '/',
} as const

export const QUERY_KEYS = {
  GENERATE_WORLD: (prompt: string) => ['generate-world', prompt] as const,
}

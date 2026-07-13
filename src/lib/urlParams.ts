import { DEFAULT_WORLD_PARAMS } from '@/constants'
import { clampWorldParams } from '@/lib/worldSchema'
import type { WorldParams } from '@/types/world'

/** Short query-string keys, in the same order as their WorldParams source field. */
const KEYS = {
  seed: 'seed',
  amplitude: 'amp',
  frequency: 'freq',
  octaves: 'oct',
  ridgeWeight: 'ridge',
  warpStrength: 'warp',
  waterLevel: 'water',
  temperature: 'temp',
  moisture: 'moist',
  timeOfDay: 't',
  fogDensity: 'fog',
  cloudCover: 'cloud',
} as const

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Encodes params into a compact query string. `seed` is always included; every other
 * field is included only when it differs from DEFAULT_WORLD_PARAMS (rounded to 3dp
 * before comparing, so float noise doesn't force a key into the URL).
 */
export function paramsToSearch(params: WorldParams): URLSearchParams {
  const search = new URLSearchParams()
  search.set(KEYS.seed, String(Math.round(params.seed)))

  const setIfChanged = (key: string, value: number, defaultValue: number) => {
    const rounded = round3(value)
    if (rounded !== round3(defaultValue)) {
      search.set(key, String(rounded))
    }
  }

  setIfChanged(KEYS.amplitude, params.terrain.amplitude, DEFAULT_WORLD_PARAMS.terrain.amplitude)
  setIfChanged(KEYS.frequency, params.terrain.frequency, DEFAULT_WORLD_PARAMS.terrain.frequency)
  setIfChanged(KEYS.octaves, params.terrain.octaves, DEFAULT_WORLD_PARAMS.terrain.octaves)
  setIfChanged(KEYS.ridgeWeight, params.terrain.ridgeWeight, DEFAULT_WORLD_PARAMS.terrain.ridgeWeight)
  setIfChanged(KEYS.warpStrength, params.terrain.warpStrength, DEFAULT_WORLD_PARAMS.terrain.warpStrength)
  setIfChanged(KEYS.waterLevel, params.terrain.waterLevel, DEFAULT_WORLD_PARAMS.terrain.waterLevel)
  setIfChanged(KEYS.temperature, params.climate.temperature, DEFAULT_WORLD_PARAMS.climate.temperature)
  setIfChanged(KEYS.moisture, params.climate.moisture, DEFAULT_WORLD_PARAMS.climate.moisture)
  setIfChanged(KEYS.timeOfDay, params.atmosphere.timeOfDay, DEFAULT_WORLD_PARAMS.atmosphere.timeOfDay)
  setIfChanged(KEYS.fogDensity, params.atmosphere.fogDensity, DEFAULT_WORLD_PARAMS.atmosphere.fogDensity)
  setIfChanged(KEYS.cloudCover, params.atmosphere.cloudCover, DEFAULT_WORLD_PARAMS.atmosphere.cloudCover)

  return search
}

/** Reads a numeric field from the search params only if the key is present and parses as a finite number. */
function readNumber(search: URLSearchParams, key: string): number | undefined {
  if (!search.has(key)) return undefined
  const raw = search.get(key)
  if (raw === null || raw === '') return undefined
  const value = Number(raw)
  return Number.isFinite(value) ? value : undefined
}

/**
 * Decodes a query string into a full WorldParams, defaulting any missing/garbage key.
 * Always routes through clampWorldParams so out-of-range or malformed values are sanitized.
 */
export function searchToParams(search: URLSearchParams): WorldParams {
  const seed = readNumber(search, KEYS.seed)
  const amplitude = readNumber(search, KEYS.amplitude)
  const frequency = readNumber(search, KEYS.frequency)
  const octaves = readNumber(search, KEYS.octaves)
  const ridgeWeight = readNumber(search, KEYS.ridgeWeight)
  const warpStrength = readNumber(search, KEYS.warpStrength)
  const waterLevel = readNumber(search, KEYS.waterLevel)
  const temperature = readNumber(search, KEYS.temperature)
  const moisture = readNumber(search, KEYS.moisture)
  const timeOfDay = readNumber(search, KEYS.timeOfDay)
  const fogDensity = readNumber(search, KEYS.fogDensity)
  const cloudCover = readNumber(search, KEYS.cloudCover)

  return clampWorldParams({
    seed: seed ?? DEFAULT_WORLD_PARAMS.seed,
    terrain: {
      amplitude: amplitude ?? DEFAULT_WORLD_PARAMS.terrain.amplitude,
      frequency: frequency ?? DEFAULT_WORLD_PARAMS.terrain.frequency,
      octaves: octaves ?? DEFAULT_WORLD_PARAMS.terrain.octaves,
      ridgeWeight: ridgeWeight ?? DEFAULT_WORLD_PARAMS.terrain.ridgeWeight,
      warpStrength: warpStrength ?? DEFAULT_WORLD_PARAMS.terrain.warpStrength,
      waterLevel: waterLevel ?? DEFAULT_WORLD_PARAMS.terrain.waterLevel,
    },
    climate: {
      temperature: temperature ?? DEFAULT_WORLD_PARAMS.climate.temperature,
      moisture: moisture ?? DEFAULT_WORLD_PARAMS.climate.moisture,
    },
    atmosphere: {
      timeOfDay: timeOfDay ?? DEFAULT_WORLD_PARAMS.atmosphere.timeOfDay,
      fogDensity: fogDensity ?? DEFAULT_WORLD_PARAMS.atmosphere.fogDensity,
      cloudCover: cloudCover ?? DEFAULT_WORLD_PARAMS.atmosphere.cloudCover,
    },
  })
}

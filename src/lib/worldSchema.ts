import { z } from 'zod'
import { DEFAULT_WORLD_PARAMS } from '@/constants'
import type { AtmosphereParams, ClimateParams, TerrainParams, WorldParams } from '@/types/world'

interface Limit {
  min: number
  max: number
  step: number
}

/** Min/max/step for every numeric WorldParams field, used by both zod validation and the UI sliders. */
export const WORLD_PARAM_LIMITS = {
  seed: { min: 1, max: 2147483647, step: 1 },
  amplitude: { min: 100, max: 500, step: 10 },
  frequency: { min: 0.6, max: 3, step: 0.05 },
  octaves: { min: 3, max: 7, step: 1 },
  ridgeWeight: { min: 0, max: 1, step: 0.05 },
  warpStrength: { min: 0, max: 2, step: 0.05 },
  waterLevel: { min: 0.05, max: 0.45, step: 0.01 },
  temperature: { min: 0, max: 1, step: 0.05 },
  moisture: { min: 0, max: 1, step: 0.05 },
  timeOfDay: { min: 0, max: 24, step: 0.25 },
  fogDensity: { min: 0, max: 1, step: 0.05 },
  cloudCover: { min: 0, max: 1, step: 0.05 },
} as const satisfies Record<string, Limit>

function numberInRange(limit: Limit, integer: boolean) {
  let schema = z.number().min(limit.min).max(limit.max)
  if (integer) schema = schema.int()
  return schema
}

const TerrainParamsSchema = z.object({
  amplitude: numberInRange(WORLD_PARAM_LIMITS.amplitude, false),
  frequency: numberInRange(WORLD_PARAM_LIMITS.frequency, false),
  octaves: numberInRange(WORLD_PARAM_LIMITS.octaves, true),
  ridgeWeight: numberInRange(WORLD_PARAM_LIMITS.ridgeWeight, false),
  warpStrength: numberInRange(WORLD_PARAM_LIMITS.warpStrength, false),
  waterLevel: numberInRange(WORLD_PARAM_LIMITS.waterLevel, false),
}) satisfies z.ZodType<TerrainParams>

const ClimateParamsSchema = z.object({
  temperature: numberInRange(WORLD_PARAM_LIMITS.temperature, false),
  moisture: numberInRange(WORLD_PARAM_LIMITS.moisture, false),
}) satisfies z.ZodType<ClimateParams>

const AtmosphereParamsSchema = z.object({
  timeOfDay: numberInRange(WORLD_PARAM_LIMITS.timeOfDay, false),
  fogDensity: numberInRange(WORLD_PARAM_LIMITS.fogDensity, false),
  cloudCover: numberInRange(WORLD_PARAM_LIMITS.cloudCover, false),
}) satisfies z.ZodType<AtmosphereParams>

export const WorldParamsSchema = z.object({
  seed: numberInRange(WORLD_PARAM_LIMITS.seed, true),
  terrain: TerrainParamsSchema,
  climate: ClimateParamsSchema,
  atmosphere: AtmosphereParamsSchema,
}) satisfies z.ZodType<WorldParams>

function clamp(value: number, limit: Limit, integer: boolean): number {
  const bounded = Math.min(limit.max, Math.max(limit.min, value))
  return integer ? Math.round(bounded) : bounded
}

/** Clamps a possibly-invalid numeric value onto its limit range, falling back to `fallback` when not a finite number. */
function clampField(value: unknown, limit: Limit, fallback: number, integer: boolean): number {
  return typeof value === 'number' && Number.isFinite(value) ? clamp(value, limit, integer) : fallback
}

/**
 * Sanitizes arbitrary input (URL params, AI output, etc.) into a valid WorldParams.
 * Never throws: invalid/missing fields fall back to DEFAULT_WORLD_PARAMS, valid partial
 * data is clamped into range and merged on top of the defaults.
 */
export function clampWorldParams(input: unknown): WorldParams {
  const parsed = WorldParamsSchema.safeParse(input)
  if (parsed.success) return parsed.data

  const raw = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>
  const terrainRaw = (typeof raw.terrain === 'object' && raw.terrain !== null ? raw.terrain : {}) as Record<
    string,
    unknown
  >
  const climateRaw = (typeof raw.climate === 'object' && raw.climate !== null ? raw.climate : {}) as Record<
    string,
    unknown
  >
  const atmosphereRaw = (
    typeof raw.atmosphere === 'object' && raw.atmosphere !== null ? raw.atmosphere : {}
  ) as Record<string, unknown>

  const defaults = DEFAULT_WORLD_PARAMS

  return {
    seed: clampField(raw.seed, WORLD_PARAM_LIMITS.seed, defaults.seed, true),
    terrain: {
      amplitude: clampField(
        terrainRaw.amplitude,
        WORLD_PARAM_LIMITS.amplitude,
        defaults.terrain.amplitude,
        false,
      ),
      frequency: clampField(
        terrainRaw.frequency,
        WORLD_PARAM_LIMITS.frequency,
        defaults.terrain.frequency,
        false,
      ),
      octaves: clampField(terrainRaw.octaves, WORLD_PARAM_LIMITS.octaves, defaults.terrain.octaves, true),
      ridgeWeight: clampField(
        terrainRaw.ridgeWeight,
        WORLD_PARAM_LIMITS.ridgeWeight,
        defaults.terrain.ridgeWeight,
        false,
      ),
      warpStrength: clampField(
        terrainRaw.warpStrength,
        WORLD_PARAM_LIMITS.warpStrength,
        defaults.terrain.warpStrength,
        false,
      ),
      waterLevel: clampField(
        terrainRaw.waterLevel,
        WORLD_PARAM_LIMITS.waterLevel,
        defaults.terrain.waterLevel,
        false,
      ),
    },
    climate: {
      temperature: clampField(
        climateRaw.temperature,
        WORLD_PARAM_LIMITS.temperature,
        defaults.climate.temperature,
        false,
      ),
      moisture: clampField(climateRaw.moisture, WORLD_PARAM_LIMITS.moisture, defaults.climate.moisture, false),
    },
    atmosphere: {
      timeOfDay: clampField(
        atmosphereRaw.timeOfDay,
        WORLD_PARAM_LIMITS.timeOfDay,
        defaults.atmosphere.timeOfDay,
        false,
      ),
      fogDensity: clampField(
        atmosphereRaw.fogDensity,
        WORLD_PARAM_LIMITS.fogDensity,
        defaults.atmosphere.fogDensity,
        false,
      ),
      cloudCover: clampField(
        atmosphereRaw.cloudCover,
        WORLD_PARAM_LIMITS.cloudCover,
        defaults.atmosphere.cloudCover,
        false,
      ),
    },
  }
}

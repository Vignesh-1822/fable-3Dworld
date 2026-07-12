import type { ClimateField, Heightfield, WorldParams } from '@/types/world'
import { fbm } from '../noise/fbm'
import { SimplexNoise2D } from '../noise/simplex'

/**
 * Derives per-vertex climate from the heightfield, Whittaker-style:
 * temperature falls with altitude (lapse rate), moisture rises near the
 * water table. Both get low-frequency noise so biome borders wander
 * instead of following contour lines.
 */
export function generateClimate(params: WorldParams, field: Heightfield): ClimateField {
  const { heights, resolution } = field
  const { seed, terrain, climate } = params

  const tempNoise = new SimplexNoise2D(seed + 303)
  const moistNoise = new SimplexNoise2D(seed + 404)
  const octaves = { octaves: 3 }

  const temperature = new Float32Array(heights.length)
  const moisture = new Float32Array(heights.length)

  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const k = j * resolution + i
      const nx = (i / (resolution - 1) - 0.5) * 2
      const ny = (j / (resolution - 1) - 0.5) * 2
      const h = heights[k]

      // Altitude above water dominates temperature (lapse rate)
      const altitude = Math.max(0, h - terrain.waterLevel)
      const t = climate.temperature + fbm(tempNoise, nx * 1.5, ny * 1.5, octaves) * 0.18 - altitude * 0.95
      temperature[k] = Math.min(1, Math.max(0, t))

      // Moisture: baseline + noise, boosted near the water table
      const waterProximity = Math.max(0, 1 - altitude * 4)
      const m =
        climate.moisture +
        fbm(moistNoise, nx * 2.2, ny * 2.2, octaves) * 0.22 +
        waterProximity * 0.15
      moisture[k] = Math.min(1, Math.max(0, m))
    }
  }

  return { temperature, moisture }
}

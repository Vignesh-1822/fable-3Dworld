import type { Heightfield, WorldParams } from '@/types/world'
import { fbm, ridgedFbm } from '../noise/fbm'
import { SimplexNoise2D } from '../noise/simplex'

/**
 * Synthesizes the terrain heightfield from world parameters.
 *
 * Pipeline: domain warp (bends coordinate space so ranges curve organically)
 * → blend of soft fBm and ridged multifractal (rolling hills vs. sharp
 * peaks) → gentle radial falloff (keeps the world edges low so water pools
 * there) → normalize to [0, 1].
 */
export function generateHeightfield(params: WorldParams, resolution: number): Heightfield {
  const { seed, terrain } = params
  const base = new SimplexNoise2D(seed)
  const warpA = new SimplexNoise2D(seed + 101)
  const warpB = new SimplexNoise2D(seed + 202)

  const heights = new Float32Array(resolution * resolution)
  const freq = terrain.frequency
  const octaves = { octaves: terrain.octaves }
  const warpOctaves = { octaves: 3 }

  let min = Infinity
  let max = -Infinity

  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      // Normalized coordinates centered on the world origin
      const nx = (i / (resolution - 1) - 0.5) * 2
      const ny = (j / (resolution - 1) - 0.5) * 2

      const wx = nx * freq
      const wy = ny * freq

      // Domain warp: offset sample position by low-frequency noise
      const qx = fbm(warpA, wx * 0.6, wy * 0.6, warpOctaves) * terrain.warpStrength
      const qy = fbm(warpB, wx * 0.6 + 5.2, wy * 0.6 + 1.3, warpOctaves) * terrain.warpStrength

      const sx = wx + qx
      const sy = wy + qy

      const soft = fbm(base, sx, sy, octaves) * 0.5 + 0.5
      const ridged = ridgedFbm(base, sx, sy, octaves)
      let h = soft * (1 - terrain.ridgeWeight) + ridged * terrain.ridgeWeight

      // Radial falloff so terrain sinks toward the world border
      const d = Math.sqrt(nx * nx + ny * ny)
      const falloff = Math.max(0, 1 - Math.pow(Math.max(0, d - 0.55) / 0.45, 2))
      h *= falloff

      // Exponent shaping: flattens valleys into plains while keeping peaks
      h = Math.pow(Math.max(0, h), 1.45)

      heights[j * resolution + i] = h
      if (h < min) min = h
      if (h > max) max = h
    }
  }

  const range = max - min || 1
  for (let k = 0; k < heights.length; k++) {
    heights[k] = (heights[k] - min) / range
  }

  smooth(heights, resolution)

  return { heights, resolution }
}

/**
 * One separable 3-tap blur pass (1-2-1 kernel). Kills single-vertex needle
 * spikes from ridged noise without softening mountain silhouettes.
 */
function smooth(heights: Float32Array, resolution: number): void {
  const tmp = new Float32Array(heights.length)
  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const left = heights[j * resolution + Math.max(0, i - 1)]
      const mid = heights[j * resolution + i]
      const right = heights[j * resolution + Math.min(resolution - 1, i + 1)]
      tmp[j * resolution + i] = (left + 2 * mid + right) * 0.25
    }
  }
  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const up = tmp[Math.max(0, j - 1) * resolution + i]
      const mid = tmp[j * resolution + i]
      const down = tmp[Math.min(resolution - 1, j + 1) * resolution + i]
      heights[j * resolution + i] = (up + 2 * mid + down) * 0.25
    }
  }
}

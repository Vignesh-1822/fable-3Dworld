import type { Heightfield } from '@/types/world'

/**
 * Bilinear sample of the normalized heightfield at continuous coordinates
 * u, v ∈ [0, 1] — u → column i (world x), v → row j (world z), matching the
 * row-major `j * resolution + i` layout and the terrain mesh mapping.
 */
export function sampleHeight(field: Heightfield, u: number, v: number): number {
  const { heights, resolution } = field
  const fx = clamp01(u) * (resolution - 1)
  const fy = clamp01(v) * (resolution - 1)

  const i0 = Math.floor(fx)
  const j0 = Math.floor(fy)
  const i1 = Math.min(resolution - 1, i0 + 1)
  const j1 = Math.min(resolution - 1, j0 + 1)
  const tx = fx - i0
  const ty = fy - j0

  const h00 = heights[j0 * resolution + i0]
  const h10 = heights[j0 * resolution + i1]
  const h01 = heights[j1 * resolution + i0]
  const h11 = heights[j1 * resolution + i1]

  const top = h00 + (h10 - h00) * tx
  const bottom = h01 + (h11 - h01) * tx
  return top + (bottom - top) * ty
}

/**
 * Approximates normal.y (1 = flat, → 0 as slope steepens) from central
 * differences of neighboring bilinear height samples, converted to meters
 * via `amplitude` and spaced in world units via `worldSize`.
 */
export function sampleUpness(
  field: Heightfield,
  u: number,
  v: number,
  amplitude: number,
  worldSize: number,
): number {
  const eps = 1 / (field.resolution - 1)

  const hL = sampleHeight(field, u - eps, v) * amplitude
  const hR = sampleHeight(field, u + eps, v) * amplitude
  const hD = sampleHeight(field, u, v - eps) * amplitude
  const hU = sampleHeight(field, u, v + eps) * amplitude

  const worldStep = eps * worldSize * 2
  const dx = (hR - hL) / worldStep
  const dz = (hU - hD) / worldStep

  // Normal ≈ normalize(-dx, 1, -dz); we only need its y component.
  return 1 / Math.sqrt(dx * dx + dz * dz + 1)
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

import {
  BufferAttribute,
  Color,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import type { ClimateField, Heightfield, WorldParams } from '@/types/world'
import { SimplexNoise2D } from '../noise/simplex'

const COLOR_SAND = new Color('#bfae7f')
const COLOR_DESERT = new Color('#c7a86a')
const COLOR_STEPPE = new Color('#9a9a58')
const COLOR_MEADOW = new Color('#6f8f43')
const COLOR_FOREST = new Color('#3e6430')
const COLOR_TAIGA = new Color('#4a6247')
const COLOR_TUNDRA = new Color('#8d8f7a')
const COLOR_ROCK = new Color('#6d675f')
const COLOR_ROCK_WARM = new Color('#8a7462')
const COLOR_SNOW = new Color('#eaeef4')

const scratch = new Color()
const rockScratch = new Color()

/**
 * Builds the terrain mesh: displaces a plane grid by the heightfield, then
 * vertex-colors it from the climate fields (Whittaker-style biome lookup:
 * temperature × moisture), with slope-driven rock, snow by cold, shoreline
 * sand, dithered biome borders and per-vertex albedo jitter so large areas
 * never read as one flat tone.
 */
export function buildTerrainMesh(
  field: Heightfield,
  climate: ClimateField,
  params: WorldParams,
  worldSize: number,
): Mesh {
  const { heights, resolution } = field
  const { amplitude, waterLevel } = params.terrain

  const geometry = new PlaneGeometry(worldSize, worldSize, resolution - 1, resolution - 1)
  geometry.rotateX(-Math.PI / 2)

  const positions = geometry.getAttribute('position') as BufferAttribute
  for (let k = 0; k < heights.length; k++) {
    positions.setY(k, heights[k] * amplitude)
  }
  positions.needsUpdate = true
  geometry.computeVertexNormals()

  const normals = geometry.getAttribute('normal') as BufferAttribute
  const colors = new Float32Array(heights.length * 3)

  const jitterNoise = new SimplexNoise2D(params.seed + 505)
  const shoreBand = 0.03

  for (let j = 0; j < resolution; j++) {
    for (let i = 0; i < resolution; i++) {
      const k = j * resolution + i
      const h = heights[k]
      const upness = normals.getY(k)
      const nx = (i / (resolution - 1) - 0.5) * 2
      const ny = (j / (resolution - 1) - 0.5) * 2

      // High-frequency jitter reused for border dithering and albedo variance
      const jitter = jitterNoise.noise(nx * 90, ny * 90)
      const dither = jitter * 0.06

      const temp = climate.temperature[k] + dither
      const moist = climate.moisture[k] + dither

      pickBiomeColor(scratch, temp, moist)

      // Shoreline sand ring just above the water table
      const shoreT = 1 - Math.min(1, Math.max(0, (h - waterLevel) / shoreBand))
      if (shoreT > 0) scratch.lerp(COLOR_SAND, shoreT * 0.9)

      // Snow wherever it is cold enough — altitude already lowered temp
      const snowT = Math.min(1, Math.max(0, (0.14 - temp) / 0.1))
      if (snowT > 0) scratch.lerp(COLOR_SNOW, snowT)

      // Steep faces expose bare rock; warm-dry rock reads sandier
      rockScratch.lerpColors(COLOR_ROCK, COLOR_ROCK_WARM, Math.max(0, temp - 0.5) * 1.4)
      const rockT = Math.min(1, Math.max(0, (0.72 - upness + dither) / 0.24))
      scratch.lerp(rockScratch, rockT)

      // Albedo variance: ±6% value jitter breaks up flat fields
      const value = 1 + jitter * 0.06
      colors[k * 3] = scratch.r * value
      colors[k * 3 + 1] = scratch.g * value
      colors[k * 3 + 2] = scratch.b * value
    }
  }

  geometry.setAttribute('color', new BufferAttribute(colors, 3))

  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
  })

  const mesh = new Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

/** Whittaker-style biome lookup: temperature × moisture → ground color. */
function pickBiomeColor(out: Color, temp: number, moist: number): void {
  if (temp < 0.22) {
    // Cold: tundra → taiga as moisture rises
    out.lerpColors(COLOR_TUNDRA, COLOR_TAIGA, smooth01(moist, 0.3, 0.7))
    return
  }
  if (moist < 0.32) {
    // Dry: desert → steppe as it gets wetter
    out.lerpColors(COLOR_DESERT, COLOR_STEPPE, smooth01(moist, 0.12, 0.32))
    return
  }
  // Temperate: meadow → forest as moisture rises, tinted colder when cool
  out.lerpColors(COLOR_MEADOW, COLOR_FOREST, smooth01(moist, 0.38, 0.75))
  const coolT = smooth01(temp, 0.38, 0.22)
  if (coolT > 0) out.lerp(COLOR_TAIGA, coolT * 0.5)
}

/** Smoothstep of x remapped from [edge0, edge1] to [0, 1]. */
function smooth01(x: number, edge0: number, edge1: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

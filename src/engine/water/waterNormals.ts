import { DataTexture, RepeatWrapping, RGBAFormat } from 'three'
import { SimplexNoise2D } from '../noise/simplex'

const SIZE = 256

/**
 * Generates a tileable water-ripple normal map from seeded simplex noise —
 * no external assets. Tileability comes from sampling the noise on a torus
 * (4 wrapped samples blended by the fractional position).
 */
export function createWaterNormalTexture(seed: number): DataTexture {
  const noise = new SimplexNoise2D(seed + 909)
  const heights = new Float32Array(SIZE * SIZE)

  const freq = 6
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const u = x / SIZE
      const v = y / SIZE
      heights[y * SIZE + x] = torusFbm(noise, u, v, freq)
    }
  }

  const data = new Uint8Array(SIZE * SIZE * 4)
  const strength = 2.2
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const xw = (x + 1) % SIZE
      const yw = (y + 1) % SIZE
      const h = heights[y * SIZE + x]
      const dx = (heights[y * SIZE + xw] - h) * strength
      const dy = (heights[yw * SIZE + x] - h) * strength

      const invLen = 1 / Math.sqrt(dx * dx + dy * dy + 1)
      const k = (y * SIZE + x) * 4
      data[k] = Math.round((-dx * invLen * 0.5 + 0.5) * 255)
      data[k + 1] = Math.round((-dy * invLen * 0.5 + 0.5) * 255)
      data[k + 2] = Math.round((invLen * 0.5 + 0.5) * 255)
      data[k + 3] = 255
    }
  }

  const texture = new DataTexture(data, SIZE, SIZE, RGBAFormat)
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.needsUpdate = true
  return texture
}

/** Seamless 2-octave fBm by blending wrapped noise samples across the tile edges. */
function torusFbm(noise: SimplexNoise2D, u: number, v: number, freq: number): number {
  let sum = 0
  let amplitude = 1
  let f = freq
  for (let octave = 0; octave < 2; octave++) {
    const x = u * f
    const y = v * f
    const n00 = noise.noise(x, y)
    const n10 = noise.noise(x - f, y)
    const n01 = noise.noise(x, y - f)
    const n11 = noise.noise(x - f, y - f)
    const blended =
      n00 * (1 - u) * (1 - v) + n10 * u * (1 - v) + n01 * (1 - u) * v + n11 * u * v
    sum += blended * amplitude
    amplitude *= 0.5
    f *= 2
  }
  return sum
}

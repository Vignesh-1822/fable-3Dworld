import type { SimplexNoise2D } from './simplex'

export interface FbmOptions {
  octaves: number
  lacunarity?: number
  gain?: number
}

/** Fractal Brownian motion — layered noise octaves, returns ~[-1, 1]. */
export function fbm(noise: SimplexNoise2D, x: number, y: number, options: FbmOptions): number {
  const { octaves, lacunarity = 2, gain = 0.48 } = options
  let amplitude = 1
  let frequency = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amplitude * noise.noise(x * frequency, y * frequency)
    norm += amplitude
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum / norm
}

/**
 * Ridged multifractal — inverted absolute noise so octave peaks form sharp
 * mountain ridges. Returns [0, 1].
 */
export function ridgedFbm(
  noise: SimplexNoise2D,
  x: number,
  y: number,
  options: FbmOptions,
): number {
  const { octaves, lacunarity = 2, gain = 0.45 } = options
  let amplitude = 0.5
  let frequency = 1
  let prev = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    const r = 1 - Math.abs(noise.noise(x * frequency, y * frequency))
    const signal = r * r
    sum += amplitude * signal * prev
    norm += amplitude
    prev = signal
    amplitude *= gain
    frequency *= lacunarity
  }
  return sum / norm
}

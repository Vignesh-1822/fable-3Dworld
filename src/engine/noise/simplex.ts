import { createRandom } from './random'

const F2 = 0.5 * (Math.sqrt(3) - 1)
const G2 = (3 - Math.sqrt(3)) / 6

const GRAD_X = [1, -1, 1, -1, 1, -1, 0, 0]
const GRAD_Y = [1, 1, -1, -1, 0, 0, 1, -1]

/**
 * Seeded 2D simplex noise (Gustavson's method) returning values in ~[-1, 1].
 * The permutation table is shuffled with the world seed so all noise in the
 * engine is fully deterministic.
 */
export class SimplexNoise2D {
  private readonly perm: Uint8Array

  constructor(seed: number) {
    const random = createRandom(seed)
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      const tmp = p[i]
      p[i] = p[j]
      p[j] = tmp
    }
    this.perm = new Uint8Array(512)
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]
  }

  noise(x: number, y: number): number {
    const perm = this.perm

    const s = (x + y) * F2
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const t = (i + j) * G2
    const x0 = x - (i - t)
    const y0 = y - (j - t)

    const i1 = x0 > y0 ? 1 : 0
    const j1 = x0 > y0 ? 0 : 1

    const x1 = x0 - i1 + G2
    const y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2
    const y2 = y0 - 1 + 2 * G2

    const ii = i & 255
    const jj = j & 255

    let n0 = 0
    let n1 = 0
    let n2 = 0

    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) {
      const g = perm[ii + perm[jj]] & 7
      t0 *= t0
      n0 = t0 * t0 * (GRAD_X[g] * x0 + GRAD_Y[g] * y0)
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) {
      const g = perm[ii + i1 + perm[jj + j1]] & 7
      t1 *= t1
      n1 = t1 * t1 * (GRAD_X[g] * x1 + GRAD_Y[g] * y1)
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) {
      const g = perm[ii + 1 + perm[jj + 1]] & 7
      t2 *= t2
      n2 = t2 * t2 * (GRAD_X[g] * x2 + GRAD_Y[g] * y2)
    }

    return 70 * (n0 + n1 + n2)
  }
}

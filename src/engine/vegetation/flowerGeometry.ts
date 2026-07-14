import { BufferAttribute, BufferGeometry, Color } from 'three'

const STEM_COLOR = new Color('#3d5a28')
const HEAD_COLORS = ['#e8e4f0', '#e9c46a', '#b56dc4', '#d9534f'].map((hex) => new Color(hex))

const FLOWERS_PER_PATCH = 5
const PATCH_RADIUS = 1
const STEM_WIDTH = 0.02
const STEM_HEIGHT = 0.35
const HEAD_SIZE = 0.09

/**
 * A small meadow patch: ~5 flowers within a 1m disc, each a thin stem quad
 * topped by a 3-quad "head" star (three head-size quads crossed at the top).
 * All flowers in a patch share one head color, rolled once per patch so
 * meadows read as color-blocked drifts rather than a rainbow scatter.
 */
export function createFlowerPatchGeometry(random: () => number): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  const headColor = HEAD_COLORS[Math.floor(random() * HEAD_COLORS.length)]

  for (let f = 0; f < FLOWERS_PER_PATCH; f++) {
    const angle = random() * Math.PI * 2
    const dist = Math.sqrt(random()) * PATCH_RADIUS
    const cx = Math.cos(angle) * dist
    const cz = Math.sin(angle) * dist

    const height = STEM_HEIGHT * (0.85 + random() * 0.3)

    addStemQuad(positions, normals, colors, indices, cx, cz, height, random)
    addHeadStar(positions, normals, colors, indices, cx, cz, height, headColor, random)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setIndex(indices)
  return geometry
}

/** One thin stem quad, billboard-style facing a random yaw. */
function addStemQuad(
  positions: number[],
  normals: number[],
  colors: number[],
  indices: number[],
  cx: number,
  cz: number,
  height: number,
  random: () => number,
): void {
  const yaw = random() * Math.PI * 2
  const halfW = STEM_WIDTH / 2
  const cosY = Math.cos(yaw)
  const sinY = Math.sin(yaw)

  const baseLeft = [cx - cosY * halfW, 0, cz - sinY * halfW]
  const baseRight = [cx + cosY * halfW, 0, cz + sinY * halfW]
  const tipLeft = [cx - cosY * halfW, height, cz - sinY * halfW]
  const tipRight = [cx + cosY * halfW, height, cz + sinY * halfW]

  const base = positions.length / 3
  positions.push(...baseLeft, ...baseRight, ...tipLeft, ...tipRight)
  for (let i = 0; i < 4; i++) normals.push(0, 1, 0)
  for (let i = 0; i < 4; i++) colors.push(STEM_COLOR.r, STEM_COLOR.g, STEM_COLOR.b)
  indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
}

/** Three head-size quads crossed at the top of the stem, forming a simple star/burst flower head. */
function addHeadStar(
  positions: number[],
  normals: number[],
  colors: number[],
  indices: number[],
  cx: number,
  cz: number,
  stemHeight: number,
  color: Color,
  random: () => number,
): void {
  const half = HEAD_SIZE / 2
  const baseYaw = random() * Math.PI * 2

  for (let q = 0; q < 3; q++) {
    const yaw = baseYaw + (q * Math.PI) / 3 // 0, 60, 120 degrees apart
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)

    const p0 = [cx - cosY * half, stemHeight - half, cz - sinY * half]
    const p1 = [cx + cosY * half, stemHeight - half, cz + sinY * half]
    const p2 = [cx - cosY * half, stemHeight + half, cz - sinY * half]
    const p3 = [cx + cosY * half, stemHeight + half, cz + sinY * half]

    const base = positions.length / 3
    positions.push(...p0, ...p1, ...p2, ...p3)
    for (let i = 0; i < 4; i++) normals.push(0, 1, 0)
    for (let i = 0; i < 4; i++) colors.push(color.r, color.g, color.b)
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }
}

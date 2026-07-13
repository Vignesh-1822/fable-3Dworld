import { BufferAttribute, BufferGeometry, Color } from 'three'

const BASE_COLOR = new Color('#3d5a28')
const TIP_COLOR = new Color('#7a9a4a')
const BLADES_PER_PATCH = 7
const PATCH_RADIUS = 1.5
const BLADE_WIDTH = 0.06

/**
 * A small clump of ~7 tapered-quad grass blades scattered within a 1.5m
 * disc, each with random height, yaw and a slight lean. Colored base→tip
 * so the material (vertex colors, no texture) still reads as grass.
 */
export function createGrassPatchGeometry(random: () => number): BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const colors: number[] = []
  const indices: number[] = []

  for (let b = 0; b < BLADES_PER_PATCH; b++) {
    const angle = random() * Math.PI * 2
    const dist = Math.sqrt(random()) * PATCH_RADIUS
    const cx = Math.cos(angle) * dist
    const cz = Math.sin(angle) * dist

    const height = 0.5 + random() * 0.4
    const yaw = random() * Math.PI * 2
    const leanAmount = height * (0.15 + random() * 0.2)
    const leanAngle = random() * Math.PI * 2

    const halfW = BLADE_WIDTH / 2
    const tipHalfW = halfW * 0.15
    const cosY = Math.cos(yaw)
    const sinY = Math.sin(yaw)
    const leanX = Math.cos(leanAngle) * leanAmount
    const leanZ = Math.sin(leanAngle) * leanAmount

    const baseLeft = [cx - cosY * halfW, 0, cz - sinY * halfW]
    const baseRight = [cx + cosY * halfW, 0, cz + sinY * halfW]
    const tipLeft = [cx - cosY * tipHalfW + leanX, height, cz - sinY * tipHalfW + leanZ]
    const tipRight = [cx + cosY * tipHalfW + leanX, height, cz + sinY * tipHalfW + leanZ]

    const base = positions.length / 3
    positions.push(...baseLeft, ...baseRight, ...tipLeft, ...tipRight)
    for (let i = 0; i < 4; i++) normals.push(0, 1, 0)
    colors.push(
      BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b,
      BASE_COLOR.r, BASE_COLOR.g, BASE_COLOR.b,
      TIP_COLOR.r, TIP_COLOR.g, TIP_COLOR.b,
      TIP_COLOR.r, TIP_COLOR.g, TIP_COLOR.b,
    )
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setIndex(indices)
  return geometry
}

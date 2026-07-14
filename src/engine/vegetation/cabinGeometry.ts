import { BoxGeometry, BufferAttribute, BufferGeometry, Color, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const WALL_COLOR = new Color('#6b5138')
const ROOF_COLOR = new Color('#3f3229')
const DOOR_COLOR = new Color('#2f241b')
const WINDOW_COLOR = new Color('#ffd98a')
const CHIMNEY_COLOR = new Color('#8a8a86')

const BOATHOUSE_WALL_COLOR = new Color('#5d5348')
const DOCK_COLOR = new Color('#4e463c')

// Warm glow color for window emissiveColor attributes. Non-glowing surfaces
// use ZERO_EMISSIVE. Kept slightly hot so it reads clearly against night fog.
const WINDOW_EMISSIVE = new Vector3(1.0, 0.62, 0.28)
const ZERO_EMISSIVE = new Vector3(0, 0, 0)

const UP = new Vector3(0, 1, 0)

/**
 * Log cabin, origin at floor center, front facing +z. Body is a jittered box,
 * roof is a raw-triangle gable prism (ridge along z, so the front reads as a
 * classic triangular gable), door and windows are offset quads on the wall
 * faces, and a small chimney box sits astride the ridge near the back.
 * Window quads get both a warm vertex color and a matching emissiveColor so
 * they glow at night via createEmissiveWindowMaterial.
 */
export function createCabinGeometry(random: () => number): BufferGeometry {
  const width = 4.6
  const height = 2.6
  const depth = 5.6
  return buildCabin(random, {
    width,
    height,
    depth,
    wallColor: WALL_COLOR,
    doorWidth: 0.9,
    doorHeight: 1.9,
    windowSize: 0.7,
    flankingWindows: true,
  })
}

/**
 * Smaller, weathered cabin with a single side window on each wall (no
 * windows flanking the door) plus a plank dock extending from the front
 * (+z, toward the water).
 */
export function createBoathouseGeometry(random: () => number): BufferGeometry {
  const width = 3.4
  const height = 2.2
  const depth = 4.2
  const cabin = buildCabin(random, {
    width,
    height,
    depth,
    wallColor: BOATHOUSE_WALL_COLOR,
    doorWidth: 0.9,
    doorHeight: 1.9,
    windowSize: 0.7,
    flankingWindows: false,
  })

  const parts: BufferGeometry[] = [cabin]

  const plankCount = 5 + Math.floor(random() * 2) // 5-6
  const plankWidth = 0.4
  const plankHeight = 0.08
  const spanWidth = width * 0.9
  const startX = -spanWidth / 2

  for (let i = 0; i < plankCount; i++) {
    const t = plankCount === 1 ? 0.5 : i / (plankCount - 1)
    const x = startX + t * spanWidth + (random() - 0.5) * 0.1
    const length = 3.5 + random() * 1.0
    const yaw = (random() - 0.5) * 0.06

    const plankGeo = boxPart(plankWidth, plankHeight, length, DOCK_COLOR, random, 0.05)
    // Pivot at the wall-attachment end (local z=0..length) before yaw/placement.
    plankGeo.translate(0, 0, length / 2)
    plankGeo.rotateY(yaw)
    plankGeo.translate(x, 0.15, depth / 2)
    parts.push(plankGeo)
  }

  const merged = mergeGeometries(parts, false)
  if (!merged) {
    throw new Error('createBoathouseGeometry: mergeGeometries failed — attribute sets differ across parts')
  }
  merged.computeBoundingBox()
  return merged
}

interface CabinSpec {
  width: number
  height: number
  depth: number
  wallColor: Color
  doorWidth: number
  doorHeight: number
  windowSize: number
  /** Front wall gets two windows flanking the door in addition to any side windows. */
  flankingWindows: boolean
}

function buildCabin(random: () => number, spec: CabinSpec): BufferGeometry {
  const { width, height, depth, wallColor, doorWidth, doorHeight, windowSize, flankingWindows } = spec
  const parts: BufferGeometry[] = []

  // Body
  const body = boxPart(width, height, depth, wallColor, random, 0.06)
  body.translate(0, height / 2, 0)
  parts.push(body)

  // Roof: raw-triangle gable prism, ridge running along z (front reads as a
  // triangular gable), overhanging the walls on every side by ~0.3m.
  const overhang = 0.3
  const halfW = width / 2 + overhang
  const zMin = -depth / 2 - overhang
  const zMax = depth / 2 + overhang
  const eaveY = height
  const roofRise = halfW * 0.6
  const ridgeY = height + roofRise

  const rp: number[] = []
  const rn: number[] = []
  const rc: number[] = []
  const re: number[] = []

  const ridgeFront = new Vector3(0, ridgeY, zMax)
  const ridgeBack = new Vector3(0, ridgeY, zMin)
  const leftEaveFront = new Vector3(-halfW, eaveY, zMax)
  const leftEaveBack = new Vector3(-halfW, eaveY, zMin)
  const rightEaveFront = new Vector3(halfW, eaveY, zMax)
  const rightEaveBack = new Vector3(halfW, eaveY, zMin)

  pushQuad(rp, rn, rc, re, leftEaveBack, leftEaveFront, ridgeFront, ridgeBack, ROOF_COLOR, ZERO_EMISSIVE)
  pushQuad(rp, rn, rc, re, ridgeBack, ridgeFront, rightEaveFront, rightEaveBack, ROOF_COLOR, ZERO_EMISSIVE)
  pushTriangle(rp, rn, rc, re, leftEaveFront, rightEaveFront, ridgeFront, ROOF_COLOR, ZERO_EMISSIVE)
  pushTriangle(rp, rn, rc, re, rightEaveBack, leftEaveBack, ridgeBack, ROOF_COLOR, ZERO_EMISSIVE)

  parts.push(buildRawGeometry(rp, rn, rc, re))

  // Door: front wall, centered, base at the floor.
  const dp: number[] = []
  const dn: number[] = []
  const dc: number[] = []
  const de: number[] = []
  const doorCenter = new Vector3(0, doorHeight / 2, depth / 2 + 0.01)
  addWallQuad(dp, dn, dc, de, doorCenter, new Vector3(0, 0, 1), doorWidth / 2, doorHeight / 2, DOOR_COLOR, ZERO_EMISSIVE)
  parts.push(buildRawGeometry(dp, dn, dc, de))

  // Windows: glowing quads — vertex color AND emissiveColor.
  const wp: number[] = []
  const wn: number[] = []
  const wc: number[] = []
  const we: number[] = []
  const windowY = height * 0.58
  const winHalf = windowSize / 2

  if (flankingWindows) {
    const flankX = doorWidth / 2 + 0.4 + winHalf
    addWallQuad(wp, wn, wc, we, new Vector3(-flankX, windowY, depth / 2 + 0.01), new Vector3(0, 0, 1), winHalf, winHalf, WINDOW_COLOR, WINDOW_EMISSIVE)
    addWallQuad(wp, wn, wc, we, new Vector3(flankX, windowY, depth / 2 + 0.01), new Vector3(0, 0, 1), winHalf, winHalf, WINDOW_COLOR, WINDOW_EMISSIVE)
  }

  addWallQuad(wp, wn, wc, we, new Vector3(-(width / 2 + 0.01), windowY, 0), new Vector3(-1, 0, 0), winHalf, winHalf, WINDOW_COLOR, WINDOW_EMISSIVE)
  addWallQuad(wp, wn, wc, we, new Vector3(width / 2 + 0.01, windowY, 0), new Vector3(1, 0, 0), winHalf, winHalf, WINDOW_COLOR, WINDOW_EMISSIVE)

  parts.push(buildRawGeometry(wp, wn, wc, we))

  // Chimney: small box straddling the ridge (x=0 is always at ridge height),
  // embedded slightly into the roof so it doesn't float.
  const chimneyWidth = 0.5
  const chimneyDepth = 0.5
  const chimneyHeight = 1.3
  const chimneyZ = zMin + Math.min(1.0, depth * 0.25)
  const chimneyBaseY = ridgeY - 0.2
  const chimneyGeo = boxPart(chimneyWidth, chimneyHeight, chimneyDepth, CHIMNEY_COLOR, random, 0.05)
  chimneyGeo.translate(0, chimneyBaseY + chimneyHeight / 2, chimneyZ)
  parts.push(chimneyGeo)

  const merged = mergeGeometries(parts, false)
  if (!merged) {
    throw new Error('createCabinGeometry: mergeGeometries failed — attribute sets differ across parts')
  }
  merged.computeBoundingBox()
  return merged
}

/**
 * Converts a BoxGeometry-derived part to non-indexed, assigns a per-vertex
 * jittered color and a zero emissiveColor (so it merges cleanly with glowing
 * parts), and drops uv so every part shares one attribute set for merging.
 */
function boxPart(
  width: number,
  height: number,
  depth: number,
  color: Color,
  random: () => number,
  jitterAmount: number,
): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth)
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  if (nonIndexed !== geometry) geometry.dispose()

  const count = nonIndexed.attributes.position.count
  const colors = new Float32Array(count * 3)
  const emissives = new Float32Array(count * 3) // zeros: non-glowing surface
  for (let i = 0; i < count; i++) {
    const jitter = 1 + (random() * 2 - 1) * jitterAmount
    colors[i * 3] = color.r * jitter
    colors[i * 3 + 1] = color.g * jitter
    colors[i * 3 + 2] = color.b * jitter
  }
  nonIndexed.setAttribute('color', new BufferAttribute(colors, 3))
  nonIndexed.setAttribute('emissiveColor', new BufferAttribute(emissives, 3))
  nonIndexed.deleteAttribute('uv')
  return nonIndexed
}

function buildRawGeometry(positions: number[], normals: number[], colors: number[], emissives: number[]): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setAttribute('emissiveColor', new BufferAttribute(new Float32Array(emissives), 3))
  return geometry
}

/** Appends a flat-shaded triangle (a, b, c) with an explicit per-face normal. */
function pushTriangle(
  positions: number[],
  normals: number[],
  colors: number[],
  emissives: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  color: Color,
  emissive: Vector3,
): void {
  const normal = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a)).normalize()
  for (const p of [a, b, c]) {
    positions.push(p.x, p.y, p.z)
    normals.push(normal.x, normal.y, normal.z)
    colors.push(color.r, color.g, color.b)
    emissives.push(emissive.x, emissive.y, emissive.z)
  }
}

/** Appends a flat-shaded quad from four corners in winding order (a, b, c, d). */
function pushQuad(
  positions: number[],
  normals: number[],
  colors: number[],
  emissives: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
  color: Color,
  emissive: Vector3,
): void {
  pushTriangle(positions, normals, colors, emissives, a, b, c, color, emissive)
  pushTriangle(positions, normals, colors, emissives, a, c, d, color, emissive)
}

/**
 * Appends an axis-aligned wall quad centered at `center`, facing outward
 * along `normal` (must be a unit axis vector). `right` is derived as
 * up × normal so the quad winds to produce that outward normal.
 */
function addWallQuad(
  positions: number[],
  normals: number[],
  colors: number[],
  emissives: number[],
  center: Vector3,
  normal: Vector3,
  halfWidth: number,
  halfHeight: number,
  color: Color,
  emissive: Vector3,
): void {
  const right = new Vector3().crossVectors(UP, normal).normalize()
  const rW = right.clone().multiplyScalar(halfWidth)
  const uH = UP.clone().multiplyScalar(halfHeight)
  const a = center.clone().sub(rW).sub(uH)
  const b = center.clone().add(rW).sub(uH)
  const c = center.clone().add(rW).add(uH)
  const d = center.clone().sub(rW).add(uH)
  pushQuad(positions, normals, colors, emissives, a, b, c, d, color, emissive)
}

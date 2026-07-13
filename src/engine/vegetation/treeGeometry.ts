import { BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, IcosahedronGeometry } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const CONIFER_TRUNK_COLOR = new Color('#5a4632')
const CONIFER_FOLIAGE_COLOR = new Color('#2f4a2a')
const BROADLEAF_TRUNK_COLOR = new Color('#6b5138')
const BROADLEAF_FOLIAGE_COLOR = new Color('#4a6b33')

/**
 * Low-poly pine: a hex trunk cylinder topped by three stacked, overlapping
 * cones that taper upward. Whole-tree value jitter (±8%) keeps a forest of
 * instances from reading as flat clones.
 */
export function createConiferGeometry(random: () => number): BufferGeometry {
  const jitter = 1 + (random() * 2 - 1) * 0.08
  const trunkColor = CONIFER_TRUNK_COLOR.clone().multiplyScalar(jitter)
  const foliageColor = CONIFER_FOLIAGE_COLOR.clone().multiplyScalar(jitter)

  const trunkRadius = 0.22 + random() * 0.06 // ~0.25m
  const trunkHeight = 2.6 + random() * 0.8 // ~3m
  const totalHeight = 9 + random() * 4 // 9-13m
  const foliageHeight = totalHeight - trunkHeight

  const trunkGeo = new CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6)
  trunkGeo.translate(0, trunkHeight / 2, 0)

  const parts: BufferGeometry[] = [colorize(trunkGeo, trunkColor)]

  const baseRadius = 2.8 * (0.85 + random() * 0.3)
  const radii = [baseRadius, baseRadius * 0.68, baseRadius * 0.42]
  const heightFractions = [0.45, 0.35, 0.3]

  let bottomY = trunkHeight - foliageHeight * 0.15
  for (let k = 0; k < 3; k++) {
    const h = foliageHeight * heightFractions[k]
    const coneGeo = new ConeGeometry(radii[k], h, 7)
    coneGeo.translate(0, bottomY + h / 2, 0)
    parts.push(colorize(coneGeo, foliageColor))
    bottomY += h * 0.72 // overlap the next cone into this one
  }

  return mergeGeometries(parts, false)
}

/**
 * Low-poly broadleaf: a trunk cylinder with 2-3 overlapping, squashed
 * icosahedron blobs forming the canopy near the top.
 */
export function createBroadleafGeometry(random: () => number): BufferGeometry {
  const jitter = 1 + (random() * 2 - 1) * 0.08
  const trunkColor = BROADLEAF_TRUNK_COLOR.clone().multiplyScalar(jitter)
  const foliageColor = BROADLEAF_FOLIAGE_COLOR.clone().multiplyScalar(jitter)

  const trunkRadius = 0.26 + random() * 0.08 // ~0.3m
  const trunkHeight = 3.6 + random() * 0.8 // ~4m
  const totalHeight = 7 + random() * 3 // 7-10m

  const trunkGeo = new CylinderGeometry(trunkRadius * 0.7, trunkRadius, trunkHeight, 6)
  trunkGeo.translate(0, trunkHeight / 2, 0)

  const parts: BufferGeometry[] = [colorize(trunkGeo, trunkColor)]

  const blobCount = 2 + Math.floor(random() * 2) // 2-3
  const canopyCenterY = trunkHeight + (totalHeight - trunkHeight) * 0.35
  for (let i = 0; i < blobCount; i++) {
    const r = 1.8 + random() * 0.8 // 1.8-2.6m
    const blobGeo = new IcosahedronGeometry(r, 1)
    blobGeo.scale(1, 0.8, 1)
    const offsetX = (random() - 0.5) * r * 1.2
    const offsetZ = (random() - 0.5) * r * 1.2
    const offsetY = canopyCenterY + (random() - 0.5) * r * 0.6
    blobGeo.translate(offsetX, offsetY, offsetZ)
    parts.push(colorize(blobGeo, foliageColor))
  }

  return mergeGeometries(parts, false)
}

/**
 * Converts to non-indexed (IcosahedronGeometry has no index while
 * Cylinder/ConeGeometry do — mergeGeometries requires all-or-none), assigns
 * a flat per-vertex color, and drops uv so every part shares one attribute
 * set for merging.
 */
function colorize(geometry: BufferGeometry, color: Color): BufferGeometry {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  if (nonIndexed !== geometry) geometry.dispose()

  const count = nonIndexed.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  nonIndexed.setAttribute('color', new BufferAttribute(colors, 3))
  nonIndexed.deleteAttribute('uv')
  return nonIndexed
}

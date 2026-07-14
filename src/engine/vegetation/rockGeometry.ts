import { BufferAttribute, BufferGeometry, Color, IcosahedronGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const ROCK_COLOR = new Color('#7a7570')

const scratchVertex = new Vector3()

/**
 * Craggy boulder: 2-3 low-poly icosahedron blobs merged with random offsets
 * and squash, then every vertex is displaced along its own direction from
 * origin for a jagged, non-smooth surface. Normals are recomputed flat
 * (facted look) after displacement, never smoothed. Origin sits at the
 * bottom so the rock rests on the ground.
 */
export function createRockGeometry(random: () => number): BufferGeometry {
  const blobCount = 2 + Math.floor(random() * 2) // 2-3
  const parts: BufferGeometry[] = []

  let maxRadius = 0
  for (let i = 0; i < blobCount; i++) {
    const r = 0.4 + random() * 0.6 // 0.4-1.0m
    maxRadius = Math.max(maxRadius, r)
    const blobGeo = new IcosahedronGeometry(r, 1)

    const squashY = 0.6 + random() * 0.2 // 0.6-0.8
    blobGeo.scale(1, squashY, 1)

    // Displace relative to the blob's own local origin (before it is offset
    // into place) so cragginess reads as surface roughness, not a lopsided
    // blob shifted toward one side.
    displace(blobGeo, random)

    const offsetX = (random() - 0.5) * 0.5
    const offsetY = (random() - 0.5) * 0.5
    const offsetZ = (random() - 0.5) * 0.5
    blobGeo.translate(offsetX, offsetY, offsetZ)

    parts.push(colorize(blobGeo, random))
  }

  const merged = mergeGeometries(parts, false)
  merged.translate(0, maxRadius * 0.7, 0) // lift so the bottom sits near y=0
  merged.computeBoundingBox()
  const minY = merged.boundingBox ? merged.boundingBox.min.y : 0
  merged.translate(0, -minY, 0) // origin at bottom
  merged.computeVertexNormals()
  return merged
}

/** Displaces every vertex ±12% along its own direction from the local origin, before normals are computed. */
function displace(geometry: BufferGeometry, random: () => number): void {
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    scratchVertex.fromBufferAttribute(position, i)
    if (scratchVertex.lengthSq() < 1e-6) continue
    const jitter = 1 + (random() * 2 - 1) * 0.12
    scratchVertex.multiplyScalar(jitter)
    position.setXYZ(i, scratchVertex.x, scratchVertex.y, scratchVertex.z)
  }
  position.needsUpdate = true
}

/**
 * Converts to non-indexed (IcosahedronGeometry has no index, matching the
 * merge requirement seen in treeGeometry.ts), assigns a per-vertex jittered
 * gray color, and drops uv so parts share one attribute set for merging.
 */
function colorize(geometry: BufferGeometry, random: () => number): BufferGeometry {
  const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry
  if (nonIndexed !== geometry) geometry.dispose()

  const count = nonIndexed.attributes.position.count
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const jitter = 1 + (random() * 2 - 1) * 0.08
    colors[i * 3] = ROCK_COLOR.r * jitter
    colors[i * 3 + 1] = ROCK_COLOR.g * jitter
    colors[i * 3 + 2] = ROCK_COLOR.b * jitter
  }
  nonIndexed.setAttribute('color', new BufferAttribute(colors, 3))
  nonIndexed.deleteAttribute('uv')
  return nonIndexed
}

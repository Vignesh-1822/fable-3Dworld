import {
  BufferAttribute,
  Color,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
} from 'three'
import type { Heightfield, WorldParams } from '@/types/world'

const COLOR_SAND = new Color('#b8a97e')
const COLOR_GRASS_LOW = new Color('#46672f')
const COLOR_GRASS_HIGH = new Color('#5d7d3b')
const COLOR_ROCK = new Color('#6d675f')
const COLOR_SNOW = new Color('#e8edf2')

const scratch = new Color()

/**
 * Builds the terrain mesh from a heightfield: displaces a plane grid,
 * then vertex-colors it by altitude and slope (shore sand → grass →
 * exposed rock on steep faces → snow caps). Placeholder shading until the
 * biome system (Phase 2) replaces it.
 */
export function buildTerrainMesh(
  field: Heightfield,
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

  const snowLine = 0.72
  const shoreBand = 0.035

  for (let k = 0; k < heights.length; k++) {
    const h = heights[k]
    const upness = normals.getY(k) // 1 = flat, 0 = vertical cliff

    if (h < waterLevel + shoreBand) {
      scratch.copy(COLOR_SAND)
    } else {
      const grassT = Math.min(1, (h - waterLevel) / Math.max(1e-4, snowLine - waterLevel))
      scratch.lerpColors(COLOR_GRASS_LOW, COLOR_GRASS_HIGH, grassT)
      if (h > snowLine) {
        const snowT = Math.min(1, (h - snowLine) / (1 - snowLine) + (upness - 0.75))
        if (snowT > 0) scratch.lerp(COLOR_SNOW, Math.min(1, snowT))
      }
    }

    // Steep faces read as bare rock regardless of altitude
    const rockT = Math.min(1, Math.max(0, (0.7 - upness) / 0.25))
    scratch.lerp(COLOR_ROCK, rockT)

    colors[k * 3] = scratch.r
    colors[k * 3 + 1] = scratch.g
    colors[k * 3 + 2] = scratch.b
  }

  geometry.setAttribute('color', new BufferAttribute(colors, 3))

  const material = new MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    flatShading: false,
  })

  const mesh = new Mesh(geometry, material)
  mesh.receiveShadow = true
  return mesh
}

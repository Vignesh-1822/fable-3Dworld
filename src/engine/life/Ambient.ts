import {
  AdditiveBlending,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Vector3,
} from 'three'
import { MeshBasicNodeMaterial } from 'three/webgpu'
import {
  cameraPosition,
  color,
  float,
  hash,
  instanceIndex,
  positionLocal,
  sin,
  time,
  uint,
  vec3,
} from 'three/tsl'
import type { Heightfield, WorldParams } from '@/types/world'
import { createRandom } from '../noise/random'
import { sampleHeight } from '../terrain/sampleField'

const SNOW_COUNT = 9000
const SNOW_RANGE = 150 // box around the camera, meters
const FIREFLY_COUNT = 700
const POLLEN_COUNT = 1200

type AmbientMode = 'snow' | 'fireflies' | 'pollen' | 'none'

/**
 * Weather / mood particles, fully GPU-animated (TSL) — no per-frame CPU work.
 * The mode is decided from the world's climate + time of day at build time
 * (particles rebuild with every setParams):
 *   cold → snowfall in a camera-following volume (infinite snow, 9k quads)
 *   warm+moist night → fireflies pulsing over the meadows
 *   temperate day → drifting pollen motes
 */
export class Ambient {
  readonly mesh: InstancedMesh | null

  constructor(field: Heightfield, params: WorldParams, worldSize: number) {
    const mode = pickMode(params)
    switch (mode) {
      case 'snow':
        this.mesh = buildSnow()
        break
      case 'fireflies':
        // Fireflies are glow, not geometry: oversized additive quads read as
        // points of light at distance where a to-scale insect would vanish
        this.mesh = buildGroundParticles(field, params, worldSize, {
          count: FIREFLY_COUNT,
          size: 0.32,
          particleColor: '#ffd36e',
          additive: true,
          pulse: true,
          heightAbove: [0.4, 2.2],
        })
        break
      case 'pollen':
        this.mesh = buildGroundParticles(field, params, worldSize, {
          count: POLLEN_COUNT,
          size: 0.06,
          particleColor: '#fff4d6',
          additive: false,
          pulse: false,
          heightAbove: [0.3, 3.5],
        })
        break
      default:
        this.mesh = null
    }
  }

  dispose(): void {
    if (!this.mesh) return
    this.mesh.geometry.dispose()
    const material = this.mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material.dispose()
  }
}

function pickMode(params: WorldParams): AmbientMode {
  const { temperature, moisture } = params.climate
  const t = params.atmosphere.timeOfDay
  const isNight = t < 5.5 || t > 19.5

  if (temperature < 0.25) return 'snow'
  if (isNight && temperature > 0.4 && moisture > 0.45) return 'fireflies'
  if (!isNight && temperature >= 0.35 && temperature <= 0.85 && moisture >= 0.4) return 'pollen'
  return 'none'
}

/** Snowfall: instance positions computed entirely in-shader from instanceIndex
 * hashes, wrapped in a camera-centered box so it snows everywhere the player
 * goes without simulating the whole world. */
function buildSnow(): InstancedMesh {
  const material = new MeshBasicNodeMaterial({ side: DoubleSide, depthWrite: false, transparent: true })

  const i = instanceIndex
  const rx = hash(i)
  const ry = hash(i.add(uint(1)))
  const rz = hash(i.add(uint(2)))
  const rs = hash(i.add(uint(3)))

  const range = float(SNOW_RANGE)
  const fallSpeed = float(5).add(rs.mul(4))
  // Wrapped fall: cycles through the box height forever
  const fallY = ry.mul(range).sub(time.mul(fallSpeed)).mod(range)
  const driftX = sin(time.mul(0.7).add(rx.mul(40))).mul(1.6)
  const driftZ = sin(time.mul(0.53).add(rz.mul(40))).mul(1.6)

  const center = vec3(
    cameraPosition.x.add(rx.sub(0.5).mul(range)).add(driftX),
    cameraPosition.y.add(range.mul(0.5)).sub(fallY),
    cameraPosition.z.add(rz.sub(0.5).mul(range)).add(driftZ),
  )
  material.positionNode = center.add(positionLocal)
  material.colorNode = color('#eef2f6')
  material.opacityNode = float(0.9)

  const mesh = new InstancedMesh(new PlaneGeometry(0.12, 0.12), material, SNOW_COUNT)
  identityMatrices(mesh)
  mesh.frustumCulled = false
  return mesh
}

interface GroundParticleOptions {
  count: number
  size: number
  particleColor: string
  additive: boolean
  pulse: boolean
  heightAbove: [number, number]
}

/** Fireflies / pollen: CPU-scattered over hospitable flat ground once per
 * world, then bobbing and (optionally) pulsing on the GPU. */
function buildGroundParticles(
  field: Heightfield,
  params: WorldParams,
  worldSize: number,
  options: GroundParticleOptions,
): InstancedMesh | null {
  const rng = createRandom(params.seed + 808)
  const { amplitude, waterLevel } = params.terrain

  const transforms: Vector3[] = []
  for (let attempt = 0; attempt < options.count * 6 && transforms.length < options.count; attempt++) {
    const u = 0.12 + rng() * 0.76
    const v = 0.12 + rng() * 0.76
    const h = sampleHeight(field, u, v)
    if (h < waterLevel + 0.01 || h > 0.6) continue
    const y =
      h * amplitude + options.heightAbove[0] + rng() * (options.heightAbove[1] - options.heightAbove[0])
    transforms.push(new Vector3((u - 0.5) * worldSize, y, (v - 0.5) * worldSize))
  }
  if (transforms.length === 0) return null

  const material = new MeshBasicNodeMaterial({
    side: DoubleSide,
    depthWrite: false,
    transparent: true,
  })
  if (options.additive) material.blending = AdditiveBlending

  const phase = hash(instanceIndex).mul(6.283)
  const bob = vec3(
    sin(time.mul(0.5).add(phase)).mul(0.6),
    sin(time.mul(0.33).add(phase.mul(1.7))).mul(0.35),
    sin(time.mul(0.41).add(phase.mul(2.3))).mul(0.6),
  )
  material.positionNode = positionLocal.add(bob)

  const base = color(options.particleColor)
  if (options.pulse) {
    const pulse = sin(time.mul(1.8).add(phase.mul(3.1))).mul(0.5).add(0.5)
    material.colorNode = base.mul(pulse.mul(1.6).add(0.1))
    material.opacityNode = pulse.mul(0.85).add(0.15)
  } else {
    material.colorNode = base
    material.opacityNode = float(0.55)
  }

  const mesh = new InstancedMesh(
    new PlaneGeometry(options.size, options.size),
    material,
    transforms.length,
  )
  const scratch = new Matrix4()
  for (let k = 0; k < transforms.length; k++) {
    scratch.makeTranslation(transforms[k].x, transforms[k].y, transforms[k].z)
    mesh.setMatrixAt(k, scratch)
  }
  mesh.instanceMatrix.needsUpdate = true
  mesh.frustumCulled = false
  return mesh
}

function identityMatrices(mesh: InstancedMesh): void {
  const identity = new Matrix4()
  for (let k = 0; k < mesh.count; k++) mesh.setMatrixAt(k, identity)
  mesh.instanceMatrix.needsUpdate = true
}

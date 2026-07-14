import {
  BufferAttribute,
  BufferGeometry,
  InstancedMesh,
  Matrix4,
  Vector3,
} from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { float, instanceIndex, positionLocal, sin, time, vec3 } from 'three/tsl'
import type { Heightfield, WorldParams } from '@/types/world'
import { createRandom } from '../noise/random'
import { sampleHeight } from '../terrain/sampleField'

const BIRDS_PER_FLOCK = 28
const FLOCK_COUNT = 3
const MIN_SPEED = 8
const MAX_SPEED = 15

const scratchMatrix = new Matrix4()
const scratchTarget = new Vector3()
const steer = new Vector3()
const diff = new Vector3()

interface Flock {
  center: Vector3
  orbitRadius: number
  orbitSpeed: number
  phase: number
  height: number
}

/**
 * Flocking birds (classic boids: separation/alignment/cohesion) drawn as one
 * InstancedMesh. Each flock orbits a drifting anchor placed over land, so
 * birds circle valleys and coastlines instead of wandering off-world. Wing
 * flap runs on the GPU (TSL) — vertices rise with |x| so only wingtips move.
 */
export class Birds {
  readonly mesh: InstancedMesh

  private readonly flocks: Flock[] = []
  private readonly positions: Vector3[] = []
  private readonly velocities: Vector3[] = []
  private readonly flockOf: number[] = []
  private t = 0

  constructor(field: Heightfield, params: WorldParams, worldSize: number) {
    const rng = createRandom(params.seed + 606)
    const amplitude = params.terrain.amplitude

    for (let f = 0; f < FLOCK_COUNT; f++) {
      // Anchor over a land cell (retry a few times, else accept whatever)
      let u = 0.5
      let v = 0.5
      for (let attempt = 0; attempt < 12; attempt++) {
        u = 0.2 + rng() * 0.6
        v = 0.2 + rng() * 0.6
        if (sampleHeight(field, u, v) > params.terrain.waterLevel + 0.05) break
      }
      const groundY = sampleHeight(field, u, v) * amplitude
      this.flocks.push({
        center: new Vector3((u - 0.5) * worldSize, 0, (v - 0.5) * worldSize),
        orbitRadius: worldSize * (0.06 + rng() * 0.08),
        orbitSpeed: 0.04 + rng() * 0.04,
        phase: rng() * Math.PI * 2,
        height: groundY + 55 + rng() * 90,
      })

      for (let b = 0; b < BIRDS_PER_FLOCK; b++) {
        const angle = rng() * Math.PI * 2
        const radius = rng() * 40
        this.positions.push(
          new Vector3(
            this.flocks[f].center.x + Math.cos(angle) * radius,
            this.flocks[f].height + (rng() - 0.5) * 20,
            this.flocks[f].center.z + Math.sin(angle) * radius,
          ),
        )
        this.velocities.push(
          new Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(MIN_SPEED),
        )
        this.flockOf.push(f)
      }
    }

    this.mesh = new InstancedMesh(createBirdGeometry(), createBirdMaterial(), this.positions.length)
    this.mesh.frustumCulled = false
    this.update(0)
  }

  update(dt: number): void {
    this.t += dt
    const clamped = Math.min(dt, 0.05)

    for (let i = 0; i < this.positions.length; i++) {
      const pos = this.positions[i]
      const vel = this.velocities[i]
      const flock = this.flocks[this.flockOf[i]]

      // Orbiting anchor the flock is drawn toward
      const orbitAngle = this.t * flock.orbitSpeed + flock.phase
      scratchTarget.set(
        flock.center.x + Math.cos(orbitAngle) * flock.orbitRadius,
        flock.height + Math.sin(this.t * 0.11 + flock.phase) * 18,
        flock.center.z + Math.sin(orbitAngle) * flock.orbitRadius,
      )

      steer.copy(scratchTarget).sub(pos).normalize().multiplyScalar(3.2)

      // Boids terms against flockmates only
      let neighbors = 0
      for (let j = 0; j < this.positions.length; j++) {
        if (j === i || this.flockOf[j] !== this.flockOf[i]) continue
        diff.copy(pos).sub(this.positions[j])
        const distSq = diff.lengthSq()
        if (distSq < 900) {
          steer.addScaledVector(this.velocities[j], 0.03) // alignment
          steer.addScaledVector(diff, -0.004) // cohesion (toward j)
          neighbors++
        }
        if (distSq < 16 && distSq > 1e-4) {
          steer.addScaledVector(diff.normalize(), 5 / Math.sqrt(distSq)) // separation
        }
      }
      if (neighbors > 0) steer.multiplyScalar(1 / (1 + neighbors * 0.05))

      vel.addScaledVector(steer, clamped)
      const speed = vel.length()
      if (speed > MAX_SPEED) vel.multiplyScalar(MAX_SPEED / speed)
      else if (speed < MIN_SPEED) vel.multiplyScalar(MIN_SPEED / Math.max(speed, 1e-3))

      pos.addScaledVector(vel, clamped)

      // Face along velocity
      scratchTarget.copy(pos).add(vel)
      scratchMatrix.lookAt(pos, scratchTarget, UP)
      scratchMatrix.setPosition(pos)
      this.mesh.setMatrixAt(i, scratchMatrix)
    }
    this.mesh.instanceMatrix.needsUpdate = true
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    const material = this.mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material.dispose()
  }
}

const UP = new Vector3(0, 1, 0)

/** Minimal bird: two swept-back wing triangles + a body sliver, dark silhouette colors. */
function createBirdGeometry(): BufferGeometry {
  // Local space: -z forward (three.js lookAt convention), x = wingspan
  // Stylized-large (~4m span) so birds read at typical camera distances
  // prettier-ignore
  const positions = new Float32Array([
    // left wing (tip swept back and slightly up)
    0, 0, -0.5,   -2.1, 0.24, 0.64,   0, 0, 0.6,
    // right wing
    0, 0, -0.5,   0, 0, 0.6,   2.1, 0.24, 0.64,
    // body fin (vertical sliver for a visible silhouette from the side)
    0, 0.14, -0.84,   0, -0.18, 0.2,   0, 0.14, 0.88,
  ])
  const colors = new Float32Array(positions.length)
  for (let i = 0; i < colors.length; i += 3) {
    colors[i] = 0.16
    colors[i + 1] = 0.17
    colors[i + 2] = 0.2
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function createBirdMaterial(): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial({ roughness: 1, metalness: 0 })
  material.vertexColors = true
  material.side = 2 // DoubleSide — wings visible from below

  // Wingtips rise/fall with |x|; per-instance phase desynchronizes the flock
  const flap = sin(time.mul(9).add(float(instanceIndex).mul(2.3)))
    .mul(positionLocal.x.abs())
    .mul(0.45)
  material.positionNode = positionLocal.add(vec3(0, flap, 0))
  return material
}

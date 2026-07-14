import type { ClimateField, Heightfield, InstanceTransform, VegetationPlacement, WorldParams } from '@/types/world'
import { createRandom } from '../noise/random'
import { sampleHeight, sampleUpness } from '../terrain/sampleField'

const GRID_SIZE = 320
const MAX_TREES = 45000
const MAX_GRASS = 60000
const MAX_ROCKS = 12000
const MAX_FLOWERS = 25000

const TREE_MOISTURE_MIN = 0.35
const TREE_MOISTURE_MAX = 0.8
const TREE_PROB_MAX = 0.55
const TREE_MIN_TEMP = 0.12
const CONIFER_MAX_TEMP = 0.32
const BROADLEAF_MIN_TEMP = 0.55

/**
 * Jittered-grid scatter over the terrain. One 320x320 grid cell is sampled
 * per iteration (position jittered within the cell), classified against
 * height/slope/temperature/moisture, and turned into an instance transform
 * for one of the five vegetation/prop types (conifers, broadleaves, grass,
 * rocks, flowers).
 */
export function scatterVegetation(
  field: Heightfield,
  climate: ClimateField,
  params: WorldParams,
  worldSize: number,
  densityScale = 1,
): VegetationPlacement {
  const rng = createRandom(params.seed + 707)
  const { amplitude, waterLevel } = params.terrain
  const { resolution } = field

  const conifers: InstanceTransform[] = []
  const broadleaves: InstanceTransform[] = []
  const grass: InstanceTransform[] = []
  const rocks: InstanceTransform[] = []
  const flowers: InstanceTransform[] = []

  const cellSize = 1 / GRID_SIZE
  let treeCount = 0

  for (let gy = 0; gy < GRID_SIZE; gy++) {
    for (let gx = 0; gx < GRID_SIZE; gx++) {
      const u = (gx + rng()) * cellSize
      const v = (gy + rng()) * cellSize

      const h = sampleHeight(field, u, v)

      const ci = clampIndex(Math.round(u * (resolution - 1)), resolution)
      const cj = clampIndex(Math.round(v * (resolution - 1)), resolution)
      const ck = cj * resolution + ci
      const t = climate.temperature[ck]
      const m = climate.moisture[ck]

      const worldX = (u - 0.5) * worldSize
      const worldZ = (v - 0.5) * worldSize
      const worldY = h * amplitude - 0.15

      const aboveWater = h >= waterLevel + 0.008
      const treeline = h <= 0.78

      // Shared across trees/rocks/flowers below — pure sample, doesn't touch
      // the rng stream, so computing it unconditionally doesn't perturb
      // determinism of the rolls that follow.
      const upness = sampleUpness(field, u, v, amplitude, worldSize)

      if (treeCount < MAX_TREES && aboveWater && treeline && upness >= 0.72) {
        let treeProb = 0
        if (m >= TREE_MOISTURE_MIN) {
          const ramp = (m - TREE_MOISTURE_MIN) / (TREE_MOISTURE_MAX - TREE_MOISTURE_MIN)
          treeProb = Math.min(TREE_PROB_MAX, ramp * TREE_PROB_MAX)
        }
        if (t < TREE_MIN_TEMP) treeProb = 0
        treeProb = Math.min(1, treeProb * densityScale)

        if (treeProb > 0 && rng() < treeProb) {
          let isConifer: boolean
          if (t < CONIFER_MAX_TEMP) {
            isConifer = true
          } else if (t > BROADLEAF_MIN_TEMP) {
            isConifer = false
          } else {
            const broadleafChance = (t - CONIFER_MAX_TEMP) / (BROADLEAF_MIN_TEMP - CONIFER_MAX_TEMP)
            isConifer = rng() >= broadleafChance
          }

          const transform: InstanceTransform = {
            x: worldX,
            y: worldY,
            z: worldZ,
            rotY: rng() * Math.PI * 2,
            scale: 0.8 + rng() * 0.5,
          }
          if (isConifer) conifers.push(transform)
          else broadleaves.push(transform)
          treeCount++
        }
      }

      // Grass: independent roll, own criteria — vegetation should not grow
      // underwater, so the water-level floor from above is reapplied here too.
      if (
        grass.length < MAX_GRASS &&
        aboveWater &&
        m >= 0.3 &&
        m <= 0.85 &&
        t >= 0.25 &&
        t <= 0.8 &&
        h < 0.6
      ) {
        const grassProb = Math.min(1, 0.5 * densityScale)
        if (rng() < grassProb) {
          grass.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            rotY: rng() * Math.PI * 2,
            scale: 0.9 + rng() * 0.6,
          })
        }
      }

      // Rocks: independent roll appended after trees/grass so existing
      // worlds keep their current layout — rocky slopes and alpine terrain
      // get a probability bump, but rocks can sit closer to shore than trees.
      if (rocks.length < MAX_ROCKS && h >= waterLevel + 0.004 && h <= 0.9) {
        let rockProb = 0.015
        if (upness < 0.78) rockProb += 0.05
        if (h > 0.6) rockProb += 0.05
        rockProb = Math.min(1, rockProb * densityScale)

        if (rng() < rockProb) {
          const rotY = rng() * Math.PI * 2
          const scale = 0.4 + rng() * rng() * 1.8
          rocks.push({
            x: worldX,
            y: worldY - 0.25 * scale,
            z: worldZ,
            rotY,
            scale,
          })
        }
      }

      // Flowers: meadow conditions — flat, well-watered, temperate ground.
      if (
        flowers.length < MAX_FLOWERS &&
        h >= waterLevel + 0.01 &&
        h <= 0.55 &&
        upness >= 0.8 &&
        m >= 0.35 &&
        m <= 0.8 &&
        t >= 0.35 &&
        t <= 0.8
      ) {
        const flowerProb = Math.min(1, 0.22 * densityScale)
        if (rng() < flowerProb) {
          flowers.push({
            x: worldX,
            y: worldY,
            z: worldZ,
            rotY: rng() * Math.PI * 2,
            scale: 0.8 + rng() * 0.6,
          })
        }
      }
    }
  }

  return { conifers, broadleaves, grass, rocks, flowers }
}

function clampIndex(i: number, resolution: number): number {
  return Math.min(resolution - 1, Math.max(0, i))
}

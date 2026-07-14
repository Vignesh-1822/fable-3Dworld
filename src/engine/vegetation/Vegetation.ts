import {
  type BufferGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Vector3,
} from 'three'
import type { Material } from 'three'
import type { InstanceTransform, VegetationPlacement } from '@/types/world'
import { createRandom } from '../noise/random'
import { createBoathouseGeometry, createCabinGeometry } from './cabinGeometry'
import { createEmissiveWindowMaterial } from './emissiveMaterial'
import { createFlowerPatchGeometry } from './flowerGeometry'
import { createGrassPatchGeometry } from './grassGeometry'
import { createRockGeometry } from './rockGeometry'
import { createBroadleafGeometry, createConiferGeometry } from './treeGeometry'
import { createStaticMaterial, createWindMaterial } from './windMaterial'

const scratchPosition = new Vector3()
const scratchQuaternion = new Quaternion()
const scratchEuler = new Euler()
const scratchScale = new Vector3()
const scratchMatrix = new Matrix4()

/**
 * Owns the InstancedMeshes (conifers, broadleaves, grass, rocks, flowers,
 * cabins, boathouses) built from a VegetationPlacement. One geometry per
 * species/prop, generated from the world seed, so different worlds get
 * visually distinct trees.
 */
export class Vegetation {
  readonly group = new Group()
  private readonly meshes: InstancedMesh[] = []

  constructor(placement: VegetationPlacement, seed: number) {
    const coniferGeometry = createConiferGeometry(createRandom(seed + 1))
    const broadleafGeometry = createBroadleafGeometry(createRandom(seed + 2))
    const grassGeometry = createGrassPatchGeometry(createRandom(seed + 3))
    const rockGeometry = createRockGeometry(createRandom(seed + 4))
    const flowerGeometry = createFlowerPatchGeometry(createRandom(seed + 5))
    const cabinGeometry = createCabinGeometry(createRandom(seed + 6))
    const boathouseGeometry = createBoathouseGeometry(createRandom(seed + 7))

    // Trees sway subtly at the crown; grass swings hard from near the base
    this.addInstancedMesh(coniferGeometry, placement.conifers, {
      strength: 0.25,
      heightRange: 11,
    })
    this.addInstancedMesh(broadleafGeometry, placement.broadleaves, {
      strength: 0.3,
      heightRange: 8,
    })
    this.addInstancedMesh(grassGeometry, placement.grass, {
      strength: 0.12,
      heightRange: 0.7,
      doubleSided: true,
    })
    // Rocks are rigid — a zero-strength wind material still declares the
    // sway uniforms and trips a WebGPU zero-size-binding validation error
    // once they constant-fold away, so rocks get the plain static material
    // instead (see createStaticMaterial's doc comment).
    this.addInstancedMesh(rockGeometry, placement.rocks, null)
    this.addInstancedMesh(flowerGeometry, placement.flowers, {
      strength: 0.1,
      heightRange: 0.4,
      doubleSided: true,
    })

    // Cabins/boathouses are rigid (no wind) and need per-vertex emissive
    // window glow, so they share one emissive material instance each rather
    // than going through the wind/static material paths above.
    this.addInstancedMeshWithMaterial(cabinGeometry, placement.cabins, createEmissiveWindowMaterial())
    this.addInstancedMeshWithMaterial(boathouseGeometry, placement.boathouses, createEmissiveWindowMaterial())
  }

  dispose(): void {
    for (const mesh of this.meshes) {
      mesh.geometry.dispose()
      const material = mesh.material
      if (Array.isArray(material)) material.forEach((m) => m.dispose())
      else material.dispose()
    }
    this.meshes.length = 0
  }

  private addInstancedMesh(
    geometry: BufferGeometry,
    transforms: InstanceTransform[],
    wind: { strength: number; heightRange: number; doubleSided?: boolean } | null,
  ): void {
    const material = wind ? createWindMaterial(wind) : createStaticMaterial()
    this.addInstancedMeshWithMaterial(geometry, transforms, material)
  }

  private addInstancedMeshWithMaterial(geometry: BufferGeometry, transforms: InstanceTransform[], material: Material): void {
    if (transforms.length === 0) {
      geometry.dispose()
      material.dispose()
      return
    }

    const mesh = new InstancedMesh(geometry, material, transforms.length)
    mesh.frustumCulled = false
    mesh.castShadow = false
    mesh.receiveShadow = false

    for (let idx = 0; idx < transforms.length; idx++) {
      const t = transforms[idx]
      scratchPosition.set(t.x, t.y, t.z)
      scratchEuler.set(0, t.rotY, 0)
      scratchQuaternion.setFromEuler(scratchEuler)
      scratchScale.set(t.scale, t.scale, t.scale)
      scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale)
      mesh.setMatrixAt(idx, scratchMatrix)
    }
    mesh.instanceMatrix.needsUpdate = true

    this.meshes.push(mesh)
    this.group.add(mesh)
  }
}

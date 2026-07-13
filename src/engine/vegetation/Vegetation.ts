import {
  type BufferGeometry,
  DoubleSide,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three'
import type { InstanceTransform, VegetationPlacement } from '@/types/world'
import { createRandom } from '../noise/random'
import { createGrassPatchGeometry } from './grassGeometry'
import { createBroadleafGeometry, createConiferGeometry } from './treeGeometry'

const scratchPosition = new Vector3()
const scratchQuaternion = new Quaternion()
const scratchEuler = new Euler()
const scratchScale = new Vector3()
const scratchMatrix = new Matrix4()

/**
 * Owns the three InstancedMeshes (conifers, broadleaves, grass) built from a
 * VegetationPlacement. One geometry per species, generated from the world
 * seed, so different worlds get visually distinct trees.
 */
export class Vegetation {
  readonly group = new Group()
  private readonly meshes: InstancedMesh[] = []

  constructor(placement: VegetationPlacement, seed: number) {
    const coniferGeometry = createConiferGeometry(createRandom(seed + 1))
    const broadleafGeometry = createBroadleafGeometry(createRandom(seed + 2))
    const grassGeometry = createGrassPatchGeometry(createRandom(seed + 3))

    this.addInstancedMesh(coniferGeometry, placement.conifers, false)
    this.addInstancedMesh(broadleafGeometry, placement.broadleaves, false)
    this.addInstancedMesh(grassGeometry, placement.grass, true)
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
    doubleSided: boolean,
  ): void {
    if (transforms.length === 0) {
      geometry.dispose()
      return
    }

    const material = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0,
    })
    if (doubleSided) material.side = DoubleSide

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

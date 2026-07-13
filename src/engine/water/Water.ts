import { Mesh, MeshStandardMaterial, PlaneGeometry, Vector2 } from 'three'
import { createWaterNormalTexture } from './waterNormals'

/**
 * The world's water surface: one huge plane (its edge lies past the far clip
 * plane, so fog owns the horizon) with a generated ripple normal map scrolled
 * diagonally each frame for cheap, deterministic animation.
 */
export class Water {
  readonly mesh: Mesh
  private readonly material: MeshStandardMaterial
  private readonly drift = new Vector2(0.013, 0.009)

  constructor(seed: number, worldSize: number) {
    const geometry = new PlaneGeometry(worldSize * 20, worldSize * 20)
    geometry.rotateX(-Math.PI / 2)

    const normalMap = createWaterNormalTexture(seed)
    normalMap.repeat.set(900, 900)

    this.material = new MeshStandardMaterial({
      color: '#2a5a72',
      roughness: 0.12,
      metalness: 0.25,
      normalMap,
      normalScale: new Vector2(0.42, 0.42),
    })

    this.mesh = new Mesh(geometry, this.material)
  }

  setLevel(y: number): void {
    this.mesh.position.y = y
  }

  update(dt: number): void {
    const map = this.material.normalMap
    if (map) {
      map.offset.x = (map.offset.x + this.drift.x * dt) % 1
      map.offset.y = (map.offset.y + this.drift.y * dt) % 1
    }
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.material.normalMap?.dispose()
    this.material.dispose()
  }
}

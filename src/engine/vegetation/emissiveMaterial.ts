import { MeshStandardNodeMaterial } from 'three/webgpu'
import { attribute } from 'three/tsl'

/**
 * Same shading pipeline as createStaticMaterial (plain vertex-colored,
 * matte roughness, no wind) but with emission driven by a per-vertex
 * `emissiveColor` attribute so glowing surfaces (e.g. cabin windows) can
 * sit in the same merged geometry/material as their non-glowing walls.
 *
 * Every geometry rendered with this material MUST carry an `emissiveColor`
 * BufferAttribute (vec3 per vertex, zeros for non-glowing surfaces) — WebGPU
 * errors if the attribute the node references is missing.
 */
export function createEmissiveWindowMaterial(): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial({
    roughness: 0.9,
    metalness: 0,
  })
  material.vertexColors = true
  material.emissiveNode = attribute('emissiveColor', 'vec3')
  return material
}

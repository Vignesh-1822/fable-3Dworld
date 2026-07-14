import { DoubleSide } from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { float, instanceIndex, positionLocal, sin, time, vec3 } from 'three/tsl'

export interface WindMaterialOptions {
  /** Horizontal displacement in meters at the top of the mesh */
  strength: number
  /** Height (m) over which sway ramps from 0 (base, stays planted) to full */
  heightRange: number
  doubleSided?: boolean
}

/**
 * Standard material whose vertices sway in the wind, computed on the GPU via
 * TSL. Sway is weighted by local height² so bases stay planted, and each
 * instance gets a phase offset from its index so a forest never moves in
 * lockstep. Runs before the instance matrix is applied, so displacement is
 * in local space and survives instancing.
 */
export function createWindMaterial(options: WindMaterialOptions): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial({
    roughness: 0.9,
    metalness: 0,
  })
  material.vertexColors = true
  if (options.doubleSided) material.side = DoubleSide

  const heightT = positionLocal.y.div(options.heightRange).clamp(0, 1)
  const weight = heightT.mul(heightT).mul(options.strength)

  const phase = float(instanceIndex).mul(1.7)
  const t = time.mul(1.6).add(phase)
  const swayX = sin(t).add(sin(t.mul(2.3)).mul(0.4))
  const swayZ = sin(t.mul(0.8).add(1.3)).mul(0.7)

  material.positionNode = positionLocal.add(vec3(swayX.mul(weight), 0, swayZ.mul(weight)))

  return material
}

/**
 * Same shading pipeline as createWindMaterial (vertex colors, matte
 * roughness) but with no positionNode at all. Rigid props (rocks) use this
 * instead of createWindMaterial({ strength: 0, ... }) — a zero-strength
 * wind node still declares the `time`/`instanceIndex` TSL uniforms, and on
 * WebGPU that produces a zero-size uniform buffer binding
 * (GPUValidationError: "Binding size ... is zero") once the sway term
 * constant-folds away. Skipping the node entirely avoids the bad binding.
 */
export function createStaticMaterial(): MeshStandardNodeMaterial {
  const material = new MeshStandardNodeMaterial({
    roughness: 0.9,
    metalness: 0,
  })
  material.vertexColors = true
  return material
}

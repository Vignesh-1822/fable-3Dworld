import {
  Color,
  DirectionalLight,
  FogExp2,
  HemisphereLight,
  MathUtils,
  Scene,
  Vector3,
} from 'three'
import { mul } from 'three/tsl'
import type { Node, NodeMaterial } from 'three/webgpu'
import { SkyMesh } from 'three/addons/objects/SkyMesh.js'
import type { AtmosphereParams } from '@/types/world'

/**
 * SkyMesh outputs radiance ~5× brighter than the classic WebGL Sky shader it
 * was ported from; this rescales it to our scene exposure (0.55) so terrain
 * lighting and sky share one tone-mapping scale.
 */
const SKY_RADIANCE_SCALE = 0.18

const NIGHT_FOG = new Color('#141b2b')
const DUSK_FOG = new Color('#9a6a4a')
const MOON_COLOR = new Color('#9db4d9')
const DAY_FOG = new Color('#dde6ee')

const SUN_WARM = new Color('#ff9a4d')
const SUN_NOON = new Color('#fff4e0')

const SKY_DAY = new Color('#bcd3ea')
const SKY_NIGHT = new Color('#42526e')
const GROUND_BOUNCE = new Color('#3a4630')

/**
 * Owns everything that depends on the sun: the physical sky dome
 * (rayleigh/mie scattering + procedural clouds), the directional sun light,
 * hemisphere skylight and exponential height fog. All of it is driven by a
 * single timeOfDay value so day/night is one slider.
 */
export class Atmosphere {
  private readonly sky = new SkyMesh()
  private readonly sun = new DirectionalLight('#ffffff', 2.5)
  private readonly hemi = new HemisphereLight(SKY_DAY, GROUND_BOUNCE, 0.5)
  private readonly fog = new FogExp2('#aec4d8', 0.0001)
  private readonly sunDirection = new Vector3()

  constructor(scene: Scene) {
    this.sky.scale.setScalar(45000)
    this.sky.material.fog = false
    const skyMaterial = this.sky.material as NodeMaterial
    if (skyMaterial.colorNode) {
      skyMaterial.colorNode = mul(skyMaterial.colorNode as Node<'vec4'>, SKY_RADIANCE_SCALE)
    }
    this.sky.turbidity.value = 4
    this.sky.rayleigh.value = 2.2
    this.sky.mieCoefficient.value = 0.005
    this.sky.mieDirectionalG.value = 0.7
    this.sky.cloudDensity.value = 0.5
    scene.add(this.sky)
    scene.add(this.sun)
    scene.add(this.hemi)
    scene.fog = this.fog
    scene.background = null
  }

  update(params: AtmosphereParams): void {
    // Sun path: rises at 6, peaks at 12, sets at 18; azimuth sweeps east→west
    const dayAngle = ((params.timeOfDay - 6) / 12) * Math.PI
    const elevationDeg = Math.sin(dayAngle) * 62
    const azimuthDeg = 115 + ((params.timeOfDay - 6) / 12) * 130

    const phi = MathUtils.degToRad(90 - elevationDeg)
    const theta = MathUtils.degToRad(azimuthDeg)
    this.sunDirection.setFromSphericalCoords(1, phi, theta)

    this.sky.sunPosition.value.copy(this.sunDirection)

    // 0 at night, 1 with the sun well up; ramps through sunrise/sunset
    const dayFactor = MathUtils.smoothstep(elevationDeg, -6, 20)
    // 1 exactly at the horizon crossings — drives the golden-hour look
    const horizonFactor =
      MathUtils.smoothstep(elevationDeg, -8, 8) * (1 - MathUtils.smoothstep(elevationDeg, 8, 30))

    // Ramps 0→1 as the sun sinks from -5° to -11°, fading the moon in
    const moonFactor = MathUtils.smoothstep(-elevationDeg, 5, 11)

    if (moonFactor === 0) {
      // Sun (possibly setting)
      this.sun.position.copy(this.sunDirection).multiplyScalar(2000)
      this.sun.intensity = 0.05 + dayFactor * 4.5
      this.sun.color.lerpColors(SUN_NOON, SUN_WARM, horizonFactor)
    } else {
      // Night: repurpose the light as a moon opposite the sun's azimuth,
      // so shadowed terrain still reads as moonlit shape, never pure black
      this.sun.position
        .set(-this.sunDirection.x, Math.abs(this.sunDirection.y) * 0.6 + 0.3, -this.sunDirection.z)
        .normalize()
        .multiplyScalar(2000)
      this.sun.intensity = 1.2 * moonFactor
      this.sun.color.copy(MOON_COLOR)
    }

    this.hemi.intensity = 0.5 + dayFactor * 0.55
    ;(this.hemi.color as Color).lerpColors(SKY_NIGHT, SKY_DAY, dayFactor)

    this.fog.color.lerpColors(NIGHT_FOG, DAY_FOG, dayFactor)
    // Dusk tint fades with the light itself so fog never glows in a dark sky
    this.fog.color.lerp(DUSK_FOG, horizonFactor * (0.3 + 0.5 * dayFactor))
    this.fog.color.multiplyScalar(0.12 + 0.88 * dayFactor * dayFactor)
    this.fog.density = 0.00004 + params.fogDensity * 0.00042

    this.sky.cloudCoverage.value = params.cloudCover
  }

  dispose(scene: Scene): void {
    scene.remove(this.sky)
    scene.remove(this.sun)
    scene.remove(this.hemi)
    this.sky.geometry.dispose()
    this.sky.material.dispose()
  }
}

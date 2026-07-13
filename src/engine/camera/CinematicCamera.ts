import { PerspectiveCamera, Vector3 } from 'three'

const DEFAULT_MIN_ALTITUDE = 180
const DEFAULT_MAX_ALTITUDE = 520

/**
 * Slow, smooth, looping flight path for hands-off screen recording.
 * Orbits the world center with an oscillating radius and altitude, while
 * the look-at target drifts in a small lissajous pattern near the center.
 * All motion frequencies are deliberately slow — nothing completes a full
 * cycle in under ~2 minutes — so recordings never look like they're looping.
 */
export class CinematicCamera {
  private readonly camera: PerspectiveCamera
  private readonly worldSize: number

  private minAltitude = DEFAULT_MIN_ALTITUDE
  private maxAltitude = DEFAULT_MAX_ALTITUDE

  private t = 0
  private readonly lookTarget = new Vector3()

  constructor(camera: PerspectiveCamera, worldSize: number) {
    this.camera = camera
    this.worldSize = worldSize
  }

  setAltitudeRange(min: number, max: number): void {
    this.minAltitude = min
    this.maxAltitude = max
  }

  update(dt: number): void {
    this.t += dt

    const radiusBase = 0.435 * this.worldSize // midpoint of 0.25..0.62
    const radiusSpread = 0.185 * this.worldSize // half of (0.62 - 0.25)
    const radius = radiusBase + Math.sin(this.t * 0.05) * radiusSpread

    const angle = this.t * 0.03

    const altitudeBase = (this.minAltitude + this.maxAltitude) / 2
    const altitudeSpread = (this.maxAltitude - this.minAltitude) / 2
    const altitude = altitudeBase + Math.sin(this.t * 0.041) * altitudeSpread

    const x = Math.cos(angle) * radius
    const z = Math.sin(angle) * radius
    this.camera.position.set(x, altitude, z)

    const driftX = Math.sin(this.t * 0.023) * 0.15 * this.worldSize
    const driftZ = Math.sin(this.t * 0.017) * 0.15 * this.worldSize
    const targetY = 0.3 * this.maxAltitude

    this.lookTarget.set(driftX, targetY, driftZ)
    this.camera.lookAt(this.lookTarget)
  }

  reset(): void {
    this.t = 0
  }
}

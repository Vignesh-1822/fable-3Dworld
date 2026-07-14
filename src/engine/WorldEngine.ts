import { ACESFilmicToneMapping, Mesh, PerspectiveCamera, Scene } from 'three'
import { WebGPURenderer } from 'three/webgpu'
import type { QualityPreset, WorldParams } from '@/types/world'
import { CinematicCamera } from './camera/CinematicCamera'
import { FlyControls } from './camera/FlyControls'
import { Birds } from './life/Birds'
import { QUALITY_SETTINGS } from './quality'
import { Atmosphere } from './sky/Atmosphere'
import { generateClimate } from './terrain/climate'
import { generateHeightfield } from './terrain/heightfield'
import { buildTerrainMesh } from './terrain/terrainMesh'
import { scatterVegetation } from './vegetation/scatter'
import { Vegetation } from './vegetation/Vegetation'
import { Water } from './water/Water'

const WORLD_SIZE = 2048 // meters per side

/**
 * Owns the renderer, scene graph and frame loop. React never touches three.js
 * objects directly — it drives this class through init/setParams/dispose.
 * WebGPURenderer transparently falls back to WebGL2 on browsers without WebGPU.
 */
export class WorldEngine {
  private renderer: WebGPURenderer | null = null
  private controls: FlyControls | null = null
  private cinematicCamera: CinematicCamera | null = null
  private cinematicEnabled = false
  private atmosphere: Atmosphere | null = null
  private resizeObserver: ResizeObserver | null = null
  private terrain: Mesh | null = null
  private water: Water | null = null
  private vegetation: Vegetation | null = null
  private birds: Birds | null = null
  private waterSeed: number | null = null
  private disposed = false
  private quality: QualityPreset
  private lastParams: WorldParams | null = null

  private readonly scene = new Scene()
  // Far plane sits beyond the water plane's edge so the horizon is seamless;
  // WebGPU's reverse-Z depth keeps precision fine at this range.
  private readonly camera = new PerspectiveCamera(60, 1, 0.5, 60000)
  private lastFrameTime = performance.now()

  constructor(quality: QualityPreset = 'high') {
    this.quality = quality
  }

  get isCinematic(): boolean {
    return this.cinematicEnabled
  }

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const renderer = new WebGPURenderer({ canvas, antialias: true })
    await renderer.init()
    if (this.disposed) {
      renderer.dispose()
      return
    }
    this.renderer = renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY_SETTINGS[this.quality].pixelRatioCap))
    renderer.toneMapping = ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.55

    this.atmosphere = new Atmosphere(this.scene)

    this.camera.position.set(-WORLD_SIZE * 0.34, 480, WORLD_SIZE * 0.38)
    this.camera.lookAt(0, 260, 0)

    this.controls = new FlyControls(this.camera, canvas)
    this.cinematicCamera = new CinematicCamera(this.camera, WORLD_SIZE)

    this.resizeObserver = new ResizeObserver(() => this.handleResize(canvas))
    this.resizeObserver.observe(canvas.parentElement ?? document.body)
    this.handleResize(canvas)

    renderer.setAnimationLoop(() => {
      const now = performance.now()
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1)
      this.lastFrameTime = now
      if (this.cinematicEnabled) {
        this.cinematicCamera?.update(dt)
      } else {
        this.controls?.update(dt)
      }
      this.water?.update(dt)
      this.birds?.update(dt)
      void renderer.render(this.scene, this.camera)
    })
  }

  /** Enables/disables the hands-off looping camera path. FlyControls stays
   * alive (not disposed) so its listeners keep working once cinematic mode
   * exits; syncFromCamera() re-derives its yaw/pitch from wherever the
   * cinematic camera left off, so the next drag continues smoothly. */
  setCinematic(enabled: boolean): void {
    if (this.cinematicEnabled === enabled) return
    this.cinematicEnabled = enabled
    if (enabled) {
      this.cinematicCamera?.reset()
    } else {
      this.controls?.syncFromCamera()
    }
  }

  /** Switches the active quality preset and rebuilds the world with it. */
  setQuality(quality: QualityPreset): void {
    if (this.quality === quality) return
    this.quality = quality
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY_SETTINGS[quality].pixelRatioCap))
    }
    if (this.lastParams) this.setParams(this.lastParams)
  }

  /** Rebuilds the world from scratch. Cheap enough to call on every change. */
  setParams(params: WorldParams): void {
    if (this.disposed) return

    this.lastParams = params
    const settings = QUALITY_SETTINGS[this.quality]

    if (this.terrain) {
      this.scene.remove(this.terrain)
      this.disposeMesh(this.terrain)
    }

    const field = generateHeightfield(params, settings.terrainResolution)
    const climate = generateClimate(params, field)
    this.terrain = buildTerrainMesh(field, climate, params, WORLD_SIZE)
    this.scene.add(this.terrain)

    if (this.vegetation) {
      this.scene.remove(this.vegetation.group)
      this.vegetation.dispose()
    }
    const placement = scatterVegetation(field, climate, params, WORLD_SIZE, settings.vegetationDensity)
    this.vegetation = new Vegetation(placement, params.seed)
    this.scene.add(this.vegetation.group)

    if (this.birds) {
      this.scene.remove(this.birds.mesh)
      this.birds.dispose()
    }
    this.birds = new Birds(field, params, WORLD_SIZE)
    this.scene.add(this.birds.mesh)

    // Water surface is seed-dependent (ripple texture); rebuild only when
    // the seed changes, otherwise just track the water level
    if (this.waterSeed !== params.seed) {
      if (this.water) {
        this.scene.remove(this.water.mesh)
        this.water.dispose()
      }
      this.water = new Water(params.seed, WORLD_SIZE)
      this.scene.add(this.water.mesh)
      this.waterSeed = params.seed
    }
    this.water?.setLevel(params.terrain.waterLevel * params.terrain.amplitude)

    this.atmosphere?.update(params.atmosphere)

    const amplitude = params.terrain.amplitude
    this.cinematicCamera?.setAltitudeRange(0.45 * amplitude, 1.5 * amplitude)
  }

  dispose(): void {
    this.disposed = true
    this.resizeObserver?.disconnect()
    this.controls?.dispose()
    this.atmosphere?.dispose(this.scene)
    if (this.terrain) this.disposeMesh(this.terrain)
    this.water?.dispose()
    this.vegetation?.dispose()
    this.birds?.dispose()
    this.renderer?.setAnimationLoop(null)
    this.renderer?.dispose()
    this.renderer = null
  }

  private disposeMesh(mesh: Mesh): void {
    mesh.geometry.dispose()
    const material = mesh.material
    if (Array.isArray(material)) material.forEach((m) => m.dispose())
    else material.dispose()
  }

  private handleResize(canvas: HTMLCanvasElement): void {
    const parent = canvas.parentElement
    if (!parent || !this.renderer) return
    const { clientWidth, clientHeight } = parent
    if (clientWidth === 0 || clientHeight === 0) return
    this.renderer.setSize(clientWidth, clientHeight, false)
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
  }
}

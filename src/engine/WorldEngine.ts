import {
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
} from 'three'
import { WebGPURenderer } from 'three/webgpu'
import type { WorldParams } from '@/types/world'
import { FlyControls } from './camera/FlyControls'
import { generateHeightfield } from './terrain/heightfield'
import { buildTerrainMesh } from './terrain/terrainMesh'

const WORLD_SIZE = 2048 // meters per side
const TERRAIN_RESOLUTION = 512 // heightfield samples per side

/**
 * Owns the renderer, scene graph and frame loop. React never touches three.js
 * objects directly — it drives this class through init/setParams/dispose.
 * WebGPURenderer transparently falls back to WebGL2 on browsers without WebGPU.
 */
export class WorldEngine {
  private renderer: WebGPURenderer | null = null
  private controls: FlyControls | null = null
  private resizeObserver: ResizeObserver | null = null
  private terrain: Mesh | null = null
  private water: Mesh | null = null
  private disposed = false

  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(60, 1, 0.5, 12000)
  private lastFrameTime = performance.now()

  async init(canvas: HTMLCanvasElement): Promise<void> {
    const renderer = new WebGPURenderer({ canvas, antialias: true })
    await renderer.init()
    if (this.disposed) {
      renderer.dispose()
      return
    }
    this.renderer = renderer
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    // Placeholder sky — Phase 3 replaces this with a real atmosphere
    const skyColor = new Color('#87a7c4')
    this.scene.background = skyColor
    this.scene.fog = new Fog(skyColor, 800, 6000)

    const sun = new DirectionalLight('#fff2dd', 2.6)
    sun.position.set(-0.6, 0.7, 0.3).multiplyScalar(1000)
    this.scene.add(sun)
    this.scene.add(new HemisphereLight('#bcd3ea', '#3a4630', 0.7))

    this.camera.position.set(-WORLD_SIZE * 0.34, 480, WORLD_SIZE * 0.38)
    this.camera.lookAt(0, 100, 0)

    this.controls = new FlyControls(this.camera, canvas)

    this.resizeObserver = new ResizeObserver(() => this.handleResize(canvas))
    this.resizeObserver.observe(canvas.parentElement ?? document.body)
    this.handleResize(canvas)

    renderer.setAnimationLoop(() => {
      const now = performance.now()
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1)
      this.lastFrameTime = now
      this.controls?.update(dt)
      void renderer.render(this.scene, this.camera)
    })
  }

  /** Rebuilds the world from scratch. Cheap enough to call on every change. */
  setParams(params: WorldParams): void {
    if (this.disposed) return

    if (this.terrain) {
      this.scene.remove(this.terrain)
      this.disposeMesh(this.terrain)
    }
    if (this.water) {
      this.scene.remove(this.water)
      this.disposeMesh(this.water)
    }

    const field = generateHeightfield(params, TERRAIN_RESOLUTION)
    this.terrain = buildTerrainMesh(field, params, WORLD_SIZE)
    this.scene.add(this.terrain)

    // Simple water plane at the configured level — Phase 4 upgrades this
    const waterGeometry = new PlaneGeometry(WORLD_SIZE * 4, WORLD_SIZE * 4)
    waterGeometry.rotateX(-Math.PI / 2)
    const waterMaterial = new MeshStandardMaterial({
      color: '#1f4d63',
      roughness: 0.12,
      metalness: 0.4,
      transparent: true,
      opacity: 0.92,
    })
    this.water = new Mesh(waterGeometry, waterMaterial)
    this.water.position.y = params.terrain.waterLevel * params.terrain.amplitude
    this.scene.add(this.water)
  }

  dispose(): void {
    this.disposed = true
    this.resizeObserver?.disconnect()
    this.controls?.dispose()
    if (this.terrain) this.disposeMesh(this.terrain)
    if (this.water) this.disposeMesh(this.water)
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

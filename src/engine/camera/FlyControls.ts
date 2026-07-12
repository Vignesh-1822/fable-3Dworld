import { PerspectiveCamera, Vector3 } from 'three'

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'])

/**
 * Drag-to-look, WASD-to-fly camera. Q/E move down/up, Shift boosts speed.
 * Drag (instead of pointer lock) keeps the demo friendly on first visit —
 * no permission prompt, works in an iframe.
 */
export class FlyControls {
  private readonly camera: PerspectiveCamera
  private readonly domElement: HTMLElement

  private yaw = 0
  private pitch = 0
  private dragging = false
  private lastX = 0
  private lastY = 0
  private readonly pressed = new Set<string>()
  private readonly forward = new Vector3()
  private readonly right = new Vector3()

  moveSpeed = 60 // meters per second
  boostMultiplier = 4
  lookSpeed = 0.0032

  constructor(camera: PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera
    this.domElement = domElement

    // Adopt the camera's initial orientation
    const dir = camera.getWorldDirection(new Vector3())
    this.pitch = Math.asin(Math.max(-1, Math.min(1, dir.y)))
    this.yaw = Math.atan2(-dir.x, -dir.z)

    domElement.addEventListener('pointerdown', this.onPointerDown)
    domElement.addEventListener('pointermove', this.onPointerMove)
    domElement.addEventListener('pointerup', this.onPointerUp)
    domElement.addEventListener('pointercancel', this.onPointerUp)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onWindowBlur)
  }

  update(dt: number): void {
    const speed =
      this.moveSpeed * (this.pressed.has('ShiftLeft') || this.pressed.has('ShiftRight') ? this.boostMultiplier : 1)

    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw))
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw))

    const move = new Vector3()
    if (this.pressed.has('KeyW')) move.add(this.forward)
    if (this.pressed.has('KeyS')) move.sub(this.forward)
    if (this.pressed.has('KeyD')) move.add(this.right)
    if (this.pressed.has('KeyA')) move.sub(this.right)
    if (this.pressed.has('KeyE')) move.y += 1
    if (this.pressed.has('KeyQ')) move.y -= 1

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * dt)
      this.camera.position.add(move)
    }

    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }

  dispose(): void {
    this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    this.domElement.removeEventListener('pointermove', this.onPointerMove)
    this.domElement.removeEventListener('pointerup', this.onPointerUp)
    this.domElement.removeEventListener('pointercancel', this.onPointerUp)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onWindowBlur)
  }

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.dragging = true
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.domElement.setPointerCapture(e.pointerId)
  }

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return
    const dx = e.clientX - this.lastX
    const dy = e.clientY - this.lastY
    this.lastX = e.clientX
    this.lastY = e.clientY
    this.yaw -= dx * this.lookSpeed
    this.pitch -= dy * this.lookSpeed
    const limit = Math.PI / 2 - 0.01
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch))
  }

  private readonly onPointerUp = (e: PointerEvent): void => {
    this.dragging = false
    if (this.domElement.hasPointerCapture(e.pointerId)) {
      this.domElement.releasePointerCapture(e.pointerId)
    }
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (MOVE_KEYS.has(e.code) || e.code.startsWith('Shift')) {
      this.pressed.add(e.code)
    }
  }

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.pressed.delete(e.code)
  }

  private readonly onWindowBlur = (): void => {
    this.pressed.clear()
    this.dragging = false
  }
}

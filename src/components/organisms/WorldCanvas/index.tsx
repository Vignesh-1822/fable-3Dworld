import { useEffect, useRef } from 'react'
import type { WorldParams } from '@/types/world'
import { WorldEngine } from '@/engine/WorldEngine'

interface WorldCanvasProps {
  params: WorldParams
  onGenerateStart?: () => void
  onGenerateEnd?: () => void
}

/** Hosts the three.js engine inside React and forwards param changes to it. */
export function WorldCanvas({ params, onGenerateStart, onGenerateEnd }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<WorldEngine | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params
  const onGenerateStartRef = useRef(onGenerateStart)
  onGenerateStartRef.current = onGenerateStart
  const onGenerateEndRef = useRef(onGenerateEnd)
  onGenerateEndRef.current = onGenerateEnd

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new WorldEngine()
    engineRef.current = engine
    void engine.init(canvas).then(() => {
      engine.setParams(paramsRef.current)
    })

    return () => {
      engineRef.current = null
      engine.dispose()
    }
  }, [])

  useEffect(() => {
    onGenerateStartRef.current?.()
    let timeoutId: number | undefined
    // Defer the expensive regenerate a frame + a tick so React has a chance to paint
    // the "generating" state before the main thread blocks on world generation.
    const rafId = requestAnimationFrame(() => {
      timeoutId = window.setTimeout(() => {
        engineRef.current?.setParams(params)
        onGenerateEndRef.current?.()
      }, 20)
    })

    return () => {
      cancelAnimationFrame(rafId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [params])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}

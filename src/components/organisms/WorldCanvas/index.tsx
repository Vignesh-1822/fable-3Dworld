import { useEffect, useRef } from 'react'
import type { WorldParams } from '@/types/world'
import { WorldEngine } from '@/engine/WorldEngine'

interface WorldCanvasProps {
  params: WorldParams
}

/** Hosts the three.js engine inside React and forwards param changes to it. */
export function WorldCanvas({ params }: WorldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<WorldEngine | null>(null)
  const paramsRef = useRef(params)
  paramsRef.current = params

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
    engineRef.current?.setParams(params)
  }, [params])

  return <canvas ref={canvasRef} className="block h-full w-full touch-none" />
}

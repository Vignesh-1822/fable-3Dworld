import { useCallback, useEffect, useState } from 'react'
import { APP_NAME } from '@/constants'
import { searchToParams, paramsToSearch } from '@/lib/urlParams'
import { detectQualityPreset } from '@/engine/quality'
import type { QualityPreset, WorldParams } from '@/types/world'
import { PromptBar, WorldCanvas, WorldControls } from '@/components/organisms'

const QUALITY_STORAGE_KEY = 'worldseed-quality'
const VALID_QUALITY_PRESETS: QualityPreset[] = ['high', 'medium', 'low']

function isQualityPreset(value: string | null): value is QualityPreset {
  return value !== null && (VALID_QUALITY_PRESETS as string[]).includes(value)
}

function initialQuality(): QualityPreset {
  const stored = typeof window === 'undefined' ? null : window.localStorage.getItem(QUALITY_STORAGE_KEY)
  return isQualityPreset(stored) ? stored : detectQualityPreset()
}

function isTypingTarget(element: Element | null): boolean {
  if (!element) return false
  const tag = element.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || element.getAttribute('contenteditable') === 'true'
}

export function WorldPage() {
  const [params, setParams] = useState<WorldParams>(() =>
    searchToParams(new URLSearchParams(window.location.search)),
  )
  const [generating, setGenerating] = useState(false)
  const [quality, setQuality] = useState<QualityPreset>(initialQuality)
  const [cinematic, setCinematic] = useState(false)

  const handleChange = useCallback((next: WorldParams) => {
    setParams(next)
    const search = paramsToSearch(next)
    const url = `${window.location.pathname}?${search.toString()}${window.location.hash}`
    window.history.replaceState(null, '', url)
  }, [])

  const handleGenerateStart = useCallback(() => setGenerating(true), [])
  const handleGenerateEnd = useCallback(() => setGenerating(false), [])

  const handleQualityChange = useCallback((next: QualityPreset) => {
    setQuality(next)
    window.localStorage.setItem(QUALITY_STORAGE_KEY, next)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'c' && e.key !== 'C') return
      if (isTypingTarget(document.activeElement)) return
      setCinematic((prev) => !prev)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-black text-white">
      <WorldCanvas
        params={params}
        quality={quality}
        cinematic={cinematic}
        onGenerateStart={handleGenerateStart}
        onGenerateEnd={handleGenerateEnd}
      />

      {!cinematic && (
        <>
          <WorldControls
            params={params}
            onChange={handleChange}
            generating={generating}
            quality={quality}
            onQualityChange={handleQualityChange}
          />

          <PromptBar onWorldGenerated={handleChange} disabled={generating} />
        </>
      )}

      <header className="pointer-events-none absolute left-4 top-4 select-none">
        <h1 className="text-lg font-semibold tracking-tight drop-shadow">{APP_NAME}</h1>
        <p className="text-xs text-white/70 drop-shadow">seed {params.seed}</p>
      </header>

      {cinematic ? (
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 select-none text-xs text-white/60 drop-shadow">
          cinematic mode — press C to exit
        </p>
      ) : (
        <footer className="pointer-events-none absolute bottom-4 left-4 hidden select-none text-xs text-white/70 drop-shadow md:block">
          drag to look · WASD to fly · Q/E down/up · Shift to boost · press C for cinematic mode
        </footer>
      )}
    </main>
  )
}

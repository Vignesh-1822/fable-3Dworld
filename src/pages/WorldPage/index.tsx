import { useCallback, useState } from 'react'
import { APP_NAME } from '@/constants'
import { searchToParams, paramsToSearch } from '@/lib/urlParams'
import type { WorldParams } from '@/types/world'
import { WorldCanvas, WorldControls } from '@/components/organisms'

export function WorldPage() {
  const [params, setParams] = useState<WorldParams>(() =>
    searchToParams(new URLSearchParams(window.location.search)),
  )
  const [generating, setGenerating] = useState(false)

  const handleChange = useCallback((next: WorldParams) => {
    setParams(next)
    const search = paramsToSearch(next)
    const url = `${window.location.pathname}?${search.toString()}${window.location.hash}`
    window.history.replaceState(null, '', url)
  }, [])

  const handleGenerateStart = useCallback(() => setGenerating(true), [])
  const handleGenerateEnd = useCallback(() => setGenerating(false), [])

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-black text-white">
      <WorldCanvas
        params={params}
        onGenerateStart={handleGenerateStart}
        onGenerateEnd={handleGenerateEnd}
      />

      <WorldControls params={params} onChange={handleChange} generating={generating} />

      <header className="pointer-events-none absolute left-4 top-4 select-none">
        <h1 className="text-lg font-semibold tracking-tight drop-shadow">{APP_NAME}</h1>
        <p className="text-xs text-white/70 drop-shadow">seed {params.seed}</p>
      </header>

      <footer className="pointer-events-none absolute bottom-4 left-4 select-none text-xs text-white/70 drop-shadow">
        drag to look · WASD to fly · Q/E down/up · Shift to boost
      </footer>
    </main>
  )
}

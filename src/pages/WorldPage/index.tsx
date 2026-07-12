import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { APP_NAME, DEFAULT_WORLD_PARAMS } from '@/constants'
import type { WorldParams } from '@/types/world'
import { WorldCanvas } from '@/components/organisms'

export function WorldPage() {
  const [searchParams] = useSearchParams()

  const params = useMemo<WorldParams>(() => {
    const seedParam = Number(searchParams.get('seed'))
    const seed = Number.isFinite(seedParam) && seedParam > 0 ? Math.floor(seedParam) : DEFAULT_WORLD_PARAMS.seed
    return { ...DEFAULT_WORLD_PARAMS, seed }
  }, [searchParams])

  return (
    <main className="relative h-dvh w-dvw overflow-hidden bg-black text-white">
      <WorldCanvas params={params} />

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

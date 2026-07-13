import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ParamSlider } from '@/components/molecules'
import { Button } from '@/components/ui/button'
import { WORLD_PARAM_LIMITS } from '@/lib/worldSchema'
import { paramsToSearch } from '@/lib/urlParams'
import type { QualityPreset, WorldParams } from '@/types/world'

interface WorldControlsProps {
  params: WorldParams
  onChange: (params: WorldParams) => void
  generating: boolean
  quality: QualityPreset
  onQualityChange: (quality: QualityPreset) => void
}

const QUALITY_OPTIONS: { value: QualityPreset; label: string }[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function formatTimeOfDay(value: number): string {
  const totalMinutes = Math.round(value * 60)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function randomSeed(): number {
  const { min, max } = WORLD_PARAM_LIMITS.seed
  return Math.floor(min + Math.random() * (max - min))
}

/** Detects the initial collapsed state once (no live resize listener, per spec). */
function initialOpenState(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia('(min-width: 768px)').matches
}

/** Glass-morphism control panel pinned top-right; drives WorldParams changes via param sliders. */
export function WorldControls({ params, onChange, generating, quality, onQualityChange }: WorldControlsProps) {
  const [open, setOpen] = useState(initialOpenState)
  const [copied, setCopied] = useState(false)

  const handleNewWorld = () => {
    onChange({ ...params, seed: randomSeed() })
  }

  const handleShare = () => {
    const search = paramsToSearch(params)
    const url = `${window.location.origin}${window.location.pathname}?${search.toString()}`
    void navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="absolute right-4 top-4 z-10 flex max-h-[calc(100dvh-2rem)] w-80 flex-col overflow-hidden rounded-xl bg-black/50 text-white ring-1 ring-white/10 backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold tracking-tight">Controls</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-white hover:bg-white/10 hover:text-white"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={open ? 'Collapse controls' : 'Expand controls'}
        >
          {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {open && (
        <div className="flex flex-col gap-5 overflow-y-auto px-4 pb-4">
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-white/60">
              <span>Seed</span>
              <span className="tabular-nums">{params.seed}</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 bg-white/10 text-white hover:bg-white/20"
                disabled={generating}
                onClick={handleNewWorld}
              >
                New world
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
                onClick={handleShare}
              >
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
            {generating && <p className="text-xs text-white/50">Growing world…</p>}
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Terrain</h3>
            <ParamSlider
              label="Mountain height"
              value={params.terrain.amplitude}
              min={WORLD_PARAM_LIMITS.amplitude.min}
              max={WORLD_PARAM_LIMITS.amplitude.max}
              step={WORLD_PARAM_LIMITS.amplitude.step}
              format={(v) => `${Math.round(v)}m`}
              onCommit={(v) => onChange({ ...params, terrain: { ...params.terrain, amplitude: v } })}
            />
            <ParamSlider
              label="Feature scale"
              value={params.terrain.frequency}
              min={WORLD_PARAM_LIMITS.frequency.min}
              max={WORLD_PARAM_LIMITS.frequency.max}
              step={WORLD_PARAM_LIMITS.frequency.step}
              format={(v) => v.toFixed(2)}
              onCommit={(v) => onChange({ ...params, terrain: { ...params.terrain, frequency: v } })}
            />
            <ParamSlider
              label="Ridginess"
              value={params.terrain.ridgeWeight}
              min={WORLD_PARAM_LIMITS.ridgeWeight.min}
              max={WORLD_PARAM_LIMITS.ridgeWeight.max}
              step={WORLD_PARAM_LIMITS.ridgeWeight.step}
              format={formatPercent}
              onCommit={(v) => onChange({ ...params, terrain: { ...params.terrain, ridgeWeight: v } })}
            />
            <ParamSlider
              label="Warp"
              value={params.terrain.warpStrength}
              min={WORLD_PARAM_LIMITS.warpStrength.min}
              max={WORLD_PARAM_LIMITS.warpStrength.max}
              step={WORLD_PARAM_LIMITS.warpStrength.step}
              format={(v) => v.toFixed(2)}
              onCommit={(v) => onChange({ ...params, terrain: { ...params.terrain, warpStrength: v } })}
            />
            <ParamSlider
              label="Water level"
              value={params.terrain.waterLevel}
              min={WORLD_PARAM_LIMITS.waterLevel.min}
              max={WORLD_PARAM_LIMITS.waterLevel.max}
              step={WORLD_PARAM_LIMITS.waterLevel.step}
              format={formatPercent}
              onCommit={(v) => onChange({ ...params, terrain: { ...params.terrain, waterLevel: v } })}
            />
            <ParamSlider
              label="Detail"
              value={params.terrain.octaves}
              min={WORLD_PARAM_LIMITS.octaves.min}
              max={WORLD_PARAM_LIMITS.octaves.max}
              step={WORLD_PARAM_LIMITS.octaves.step}
              format={(v) => String(Math.round(v))}
              onCommit={(v) => onChange({ ...params, terrain: { ...params.terrain, octaves: Math.round(v) } })}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Climate</h3>
            <ParamSlider
              label="Temperature"
              value={params.climate.temperature}
              min={WORLD_PARAM_LIMITS.temperature.min}
              max={WORLD_PARAM_LIMITS.temperature.max}
              step={WORLD_PARAM_LIMITS.temperature.step}
              format={formatPercent}
              onCommit={(v) => onChange({ ...params, climate: { ...params.climate, temperature: v } })}
            />
            <ParamSlider
              label="Moisture"
              value={params.climate.moisture}
              min={WORLD_PARAM_LIMITS.moisture.min}
              max={WORLD_PARAM_LIMITS.moisture.max}
              step={WORLD_PARAM_LIMITS.moisture.step}
              format={formatPercent}
              onCommit={(v) => onChange({ ...params, climate: { ...params.climate, moisture: v } })}
            />
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Atmosphere</h3>
            <ParamSlider
              label="Time of day"
              value={params.atmosphere.timeOfDay}
              min={WORLD_PARAM_LIMITS.timeOfDay.min}
              max={WORLD_PARAM_LIMITS.timeOfDay.max}
              step={WORLD_PARAM_LIMITS.timeOfDay.step}
              format={formatTimeOfDay}
              onCommit={(v) => onChange({ ...params, atmosphere: { ...params.atmosphere, timeOfDay: v } })}
            />
            <ParamSlider
              label="Fog"
              value={params.atmosphere.fogDensity}
              min={WORLD_PARAM_LIMITS.fogDensity.min}
              max={WORLD_PARAM_LIMITS.fogDensity.max}
              step={WORLD_PARAM_LIMITS.fogDensity.step}
              format={formatPercent}
              onCommit={(v) => onChange({ ...params, atmosphere: { ...params.atmosphere, fogDensity: v } })}
            />
            <ParamSlider
              label="Clouds"
              value={params.atmosphere.cloudCover}
              min={WORLD_PARAM_LIMITS.cloudCover.min}
              max={WORLD_PARAM_LIMITS.cloudCover.max}
              step={WORLD_PARAM_LIMITS.cloudCover.step}
              format={formatPercent}
              onCommit={(v) => onChange({ ...params, atmosphere: { ...params.atmosphere, cloudCover: v } })}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Quality</h3>
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={quality === option.value ? 'secondary' : 'outline'}
                  size="sm"
                  className={
                    quality === option.value
                      ? 'flex-1 bg-white/20 text-white hover:bg-white/30'
                      : 'flex-1 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white'
                  }
                  aria-pressed={quality === option.value}
                  onClick={() => onQualityChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

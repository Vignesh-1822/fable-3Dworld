import { useEffect, useState } from 'react'
import { Slider } from '@/components/ui/slider'

interface ParamSliderProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  onCommit: (value: number) => void
}

/**
 * A labeled shadcn Slider with local drag state. `onCommit` fires only when the drag
 * ends (Radix's onValueCommit), not on every intermediate tick — regenerating the
 * world is expensive, so we don't want to trigger it while the user is still dragging.
 */
export function ParamSlider({ label, value, min, max, step, format, onCommit }: ParamSliderProps) {
  const [draftValue, setDraftValue] = useState(value)

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  const displayValue = format ? format(draftValue) : draftValue.toFixed(2)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/80">{label}</span>
        <span className="tabular-nums text-white/60">{displayValue}</span>
      </div>
      <Slider
        value={[draftValue]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => {
          if (next !== undefined) setDraftValue(next)
        }}
        onValueCommit={([next]) => {
          if (next !== undefined) onCommit(next)
        }}
      />
    </div>
  )
}

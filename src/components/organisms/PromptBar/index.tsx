import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGenerateWorld } from '@/hooks'
import type { WorldParams } from '@/types/world'

interface PromptBarProps {
  onWorldGenerated: (params: WorldParams) => void
  disabled?: boolean
}

const MAX_PROMPT_LENGTH = 400

const PRESET_PROMPTS = [
  'Misty pine valley at dawn',
  'Golden desert at dusk',
  'Arctic archipelago under moonlight',
  'Lush tropical islands at noon',
]

/** Centered bottom bar that turns a natural-language prompt into a new WorldParams via the AI backend. */
export function PromptBar({ onWorldGenerated, disabled = false }: PromptBarProps) {
  const [prompt, setPrompt] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { mutate, isPending } = useGenerateWorld()

  const isDisabled = disabled || isPending

  const submit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || isDisabled) return

    setError(null)
    mutate(trimmed, {
      onSuccess: (params) => {
        onWorldGenerated(params)
        setPrompt('')
      },
      onError: (err) => {
        setError(err instanceof Error ? err.message : 'Failed to generate world')
      },
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submit(prompt)
  }

  const handleChipClick = (chip: string) => {
    setPrompt(chip)
    submit(chip)
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-10 w-[min(90vw,560px)] -translate-x-1/2 select-none">
      <div className="mb-2 flex flex-wrap justify-center gap-1.5">
        {PRESET_PROMPTS.map((chip) => (
          <button
            key={chip}
            type="button"
            disabled={isDisabled}
            onClick={() => handleChipClick(chip)}
            className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-xs text-white/70 backdrop-blur-md transition-colors hover:bg-white/10 hover:text-white disabled:pointer-events-none disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {error && <p className="mb-1.5 px-1 text-xs text-red-300">{error}</p>}

      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/50 p-2 text-white backdrop-blur-md"
      >
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isDisabled}
          maxLength={MAX_PROMPT_LENGTH}
          placeholder="Describe a world… e.g. misty pine valley at dawn"
          className="border-none bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isDisabled || !prompt.trim()}
          className="shrink-0 gap-1.5 bg-white/10 text-white hover:bg-white/20"
        >
          {isPending ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Dreaming…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5" />
              Dream it
            </>
          )}
        </Button>
      </form>
    </div>
  )
}

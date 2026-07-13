import { useMutation } from '@tanstack/react-query'
import { generateWorldParams } from '@/services'

/** Mutation that turns a natural-language prompt into a new WorldParams via the AI backend. */
export function useGenerateWorld() {
  return useMutation({
    mutationFn: (prompt: string) => generateWorldParams(prompt),
  })
}

import type { QualityPreset } from '@/types/world'

export interface QualitySettings {
  pixelRatioCap: number
  terrainResolution: number
  vegetationDensity: number
}

export const QUALITY_SETTINGS: Record<QualityPreset, QualitySettings> = {
  high: { pixelRatioCap: 2, terrainResolution: 512, vegetationDensity: 1 },
  medium: { pixelRatioCap: 1.5, terrainResolution: 384, vegetationDensity: 0.6 },
  low: { pixelRatioCap: 1, terrainResolution: 256, vegetationDensity: 0.35 },
}

/** Best-effort device capability guess. All navigator accesses are guarded —
 * some fields are undefined outside a browser and on older devices. */
export function detectQualityPreset(): QualityPreset {
  if (typeof navigator === 'undefined') return 'medium'

  const maxTouchPoints = navigator.maxTouchPoints ?? 0
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4

  if (maxTouchPoints > 1 || hardwareConcurrency <= 4) return 'low'
  if ('gpu' in navigator && hardwareConcurrency >= 8) return 'high'
  return 'medium'
}

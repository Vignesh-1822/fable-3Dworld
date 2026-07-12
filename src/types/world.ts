export interface TerrainParams {
  /** Peak height in world meters */
  amplitude: number
  /** Base noise frequency — higher = more, smaller mountains */
  frequency: number
  /** fBm octave count (detail levels) */
  octaves: number
  /** 0 = soft rolling hills, 1 = sharp ridged mountains */
  ridgeWeight: number
  /** Domain warp strength — bends mountain ranges into organic shapes */
  warpStrength: number
  /** Normalized water level in [0, 1] of terrain height range */
  waterLevel: number
}

export interface WorldParams {
  seed: number
  terrain: TerrainParams
}

export interface Heightfield {
  /** Row-major normalized heights in [0, 1], resolution × resolution samples */
  heights: Float32Array
  resolution: number
}

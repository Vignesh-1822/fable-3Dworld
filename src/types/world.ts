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

export interface ClimateParams {
  /** Baseline temperature in [0, 1]: 0 = arctic, 1 = tropical */
  temperature: number
  /** Baseline moisture in [0, 1]: 0 = desert, 1 = rainforest */
  moisture: number
}

export interface AtmosphereParams {
  /** Hour of day in [0, 24) — 6 ≈ sunrise, 12 = noon, 18 ≈ sunset */
  timeOfDay: number
  /** Fog thickness in [0, 1] */
  fogDensity: number
  /** Cloud coverage in [0, 1] */
  cloudCover: number
}

export type QualityPreset = 'high' | 'medium' | 'low'

export interface WorldParams {
  seed: number
  terrain: TerrainParams
  climate: ClimateParams
  atmosphere: AtmosphereParams
}

export interface ClimateField {
  /** Per-vertex temperature in [0, 1], altitude lapse already applied */
  temperature: Float32Array
  /** Per-vertex moisture in [0, 1] */
  moisture: Float32Array
}

export interface Heightfield {
  /** Row-major normalized heights in [0, 1], resolution × resolution samples */
  heights: Float32Array
  resolution: number
}

/** A single instanced-mesh placement: world position, Y rotation, uniform scale. */
export interface InstanceTransform {
  x: number
  y: number
  z: number
  rotY: number
  scale: number
}

/** Scattered vegetation instances, grouped by species/type for instanced rendering. */
export interface VegetationPlacement {
  conifers: InstanceTransform[]
  broadleaves: InstanceTransform[]
  grass: InstanceTransform[]
  rocks: InstanceTransform[]
  flowers: InstanceTransform[]
  cabins: InstanceTransform[]
  boathouses: InstanceTransform[]
}

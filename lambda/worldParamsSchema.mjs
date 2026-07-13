/**
 * JSON schema Claude's structured output must follow. Structured outputs do
 * not support numeric min/max constraints, so ranges live in the descriptions
 * and the caller clamps the result (the frontend re-clamps too — defense in
 * depth against an out-of-range model output).
 */
export const WORLD_PARAMS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['seed', 'terrain', 'climate', 'atmosphere'],
  properties: {
    seed: {
      type: 'integer',
      description:
        'World seed, any integer 1 to 2147483647. Pick arbitrarily unless the description implies a specific world identity.',
    },
    terrain: {
      type: 'object',
      additionalProperties: false,
      required: ['amplitude', 'frequency', 'octaves', 'ridgeWeight', 'warpStrength', 'waterLevel'],
      properties: {
        amplitude: {
          type: 'number',
          description:
            'Peak height in meters, 100 (gentle hills) to 500 (towering peaks). Default 320.',
        },
        frequency: {
          type: 'number',
          description:
            'Feature scale, 0.6 (few huge landmasses) to 3 (many small features). Default 1.4.',
        },
        octaves: {
          type: 'integer',
          description: 'Detail level, 3 (smooth) to 7 (very detailed). Default 6.',
        },
        ridgeWeight: {
          type: 'number',
          description: '0 (soft rolling hills) to 1 (sharp alpine ridges). Default 0.6.',
        },
        warpStrength: {
          type: 'number',
          description: '0 (regular shapes) to 2 (surreal twisted landforms). Default 0.8.',
        },
        waterLevel: {
          type: 'number',
          description:
            '0.05 (dry world, little water) to 0.45 (archipelago, mostly ocean). Default 0.18.',
        },
      },
    },
    climate: {
      type: 'object',
      additionalProperties: false,
      required: ['temperature', 'moisture'],
      properties: {
        temperature: {
          type: 'number',
          description: '0 (arctic, all snow) to 1 (tropical). 0.55 is temperate.',
        },
        moisture: {
          type: 'number',
          description: '0 (barren desert) to 1 (lush rainforest). 0.6 is mixed greenery.',
        },
      },
    },
    atmosphere: {
      type: 'object',
      additionalProperties: false,
      required: ['timeOfDay', 'fogDensity', 'cloudCover'],
      properties: {
        timeOfDay: {
          type: 'number',
          description:
            'Hour 0-24. 6.5 sunrise, 12 noon, 17.5 golden hour, 19 dusk, 0 moonlit night.',
        },
        fogDensity: {
          type: 'number',
          description: '0 (crystal clear) to 1 (thick mist). Default 0.35.',
        },
        cloudCover: {
          type: 'number',
          description: '0 (clear sky) to 1 (overcast). Default 0.4.',
        },
      },
    },
  },
}

export const SYSTEM_PROMPT = `You translate a short natural-language description of an imaginary landscape into parameters for a procedural 3D world engine.

Rules:
- Interpret the mood and imagery of the description, not just literal keywords. "Mordor" implies dark, jagged, barren; "the Shire" implies gentle green hills at a warm hour.
- Every parameter matters: pick deliberate values for all of them, using the defaults only when the description gives no signal.
- Lighting sells the mood — choose timeOfDay, fogDensity and cloudCover to match the described atmosphere.
- Temperature and moisture drive biomes: snow needs temperature below 0.3; desert needs moisture below 0.3; dense forest needs moisture above 0.6.
- If the description names a season or weather, encode it (winter = low temperature; storm = high cloudCover and fog).
- Respond only with the JSON object.`

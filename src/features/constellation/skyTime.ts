export type SkyPhase = 'daylight' | 'sunset' | 'night'
export type ThemeMode = 'auto' | SkyPhase

export interface SkyVisualState {
  phase: SkyPhase
  dayProgress: number
  sunriseWeight: number
  daylightWeight: number
  sunsetWeight: number
  nightWeight: number
  starVisibility: number
  cloudVisibility: number
  constellationVisibility: number
  horizonWarmth: number
  hazeVisibility: number
}

// Local-clock art direction, not an astronomical sunrise or a game time source.
// Each row is [minute, sunrise, daylight, sunset, night]. Adjacent rows blend.
const stops = [
  [0, 0, 0, 0, 1], [270, 0, 0, 0, 1], [300, 0.3, 0, 0, 0.7],
  [420, 0.8, 0.2, 0, 0], [540, 0, 1, 0, 0], [600, 0, 1, 0, 0],
  [930, 0, 1, 0, 0], [960, 0, 0.94, 0.06, 0],
  [1020, 0, 0.3, 0.7, 0], [1140, 0, 0, 0.85, 0.15],
  [1200, 0, 0, 0.5, 0.5], [1260, 0, 0, 0.15, 0.85],
  [1320, 0, 0, 0, 1], [1440, 0, 0, 0, 1],
] as const

export function getPhaseForHour(hour: number): SkyPhase {
  const h = ((hour % 24) + 24) % 24
  return h >= 5 && h < 17 ? 'daylight' : h >= 17 && h < 21 ? 'sunset' : 'night'
}

export function getSkyVisualState(minuteOfDay: number): SkyVisualState {
  const minute = Number.isFinite(minuteOfDay) ? ((minuteOfDay % 1440) + 1440) % 1440 : 0
  const index = stops.findIndex(stop => stop[0] > minute)
  const left = stops[index - 1]
  const right = stops[index]
  const progress = (minute - left[0]) / (right[0] - left[0])
  const blend = (column: 1 | 2 | 3 | 4) => left[column] + (right[column] - left[column]) * progress
  const sunriseWeight = blend(1)
  const daylightWeight = blend(2)
  const sunsetWeight = blend(3)
  const nightWeight = blend(4)
  return {
    phase: getPhaseForHour(minute / 60), dayProgress: minute / 1440,
    sunriseWeight, daylightWeight, sunsetWeight, nightWeight,
    starVisibility: sunriseWeight * 0.1 + daylightWeight * 0.006 + sunsetWeight * 0.26 + nightWeight,
    cloudVisibility: sunriseWeight * 0.8 + daylightWeight * 0.94 + sunsetWeight * 0.72 + nightWeight * 0.08,
    constellationVisibility: sunriseWeight * 0.2 + daylightWeight * 0.055 + sunsetWeight * 0.48 + nightWeight * 0.7,
    horizonWarmth: sunriseWeight * 0.8 + daylightWeight * 0.13 + sunsetWeight * 0.95 + nightWeight * 0.02,
    hazeVisibility: sunsetWeight * 0.04 + nightWeight * 0.7,
  }
}

export function getVisualStateForMode(mode: ThemeMode, localDate: Date): SkyVisualState {
  const representative = { daylight: 660, sunset: 1130, night: 1380 }
  return getSkyVisualState(mode === 'auto'
    ? localDate.getHours() * 60 + localDate.getMinutes() + localDate.getSeconds() / 60
    : representative[mode])
}

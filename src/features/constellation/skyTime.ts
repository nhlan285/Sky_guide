export type SkyPhase = 'daylight' | 'sunset' | 'night';
export type ThemeMode = 'auto' | 'daylight' | 'sunset' | 'night';

export function getPhaseForHour(hour: number): SkyPhase {
  if (hour >= 5 && hour < 17) {
    return 'daylight';
  } else if (hour >= 17 && hour < 21) {
    return 'sunset';
  } else {
    return 'night';
  }
}

export function getCurrentPhase(): SkyPhase {
  const hour = new Date().getHours();
  return getPhaseForHour(hour);
}

export function getThemeTokens(): Record<string, string> {
  // Returns empty object, actual variables are handled by data-theme CSS classes
  return {};
}

import { useState, useEffect } from 'react';
import { getCurrentPhase } from './skyTime';
import type { SkyPhase, ThemeMode } from './skyTime';

export function useTheme(): {
  mode: ThemeMode;
  phase: SkyPhase;
  setMode: (m: ThemeMode) => void;
} {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('sky-guide-theme');
    if (stored === 'daylight' || stored === 'sunset' || stored === 'night' || stored === 'auto') {
      return stored as ThemeMode;
    }
    return 'auto';
  });

  const [phase, setPhase] = useState<SkyPhase>(() => {
    if (mode === 'auto') return getCurrentPhase();
    return mode as SkyPhase;
  });

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('sky-guide-theme', newMode);
  };

  useEffect(() => {
    const updatePhase = () => {
      const currentMode = localStorage.getItem('sky-guide-theme') || 'auto';
      if (currentMode === 'auto') {
        setPhase(getCurrentPhase());
      } else {
        setPhase(currentMode as SkyPhase);
      }
    };

    updatePhase();
    const intervalId = setInterval(updatePhase, 60000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updatePhase();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [mode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', phase);
  }, [phase]);

  return { mode, phase, setMode };
}

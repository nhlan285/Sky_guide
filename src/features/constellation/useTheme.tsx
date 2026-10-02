import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getVisualStateForMode } from './skyTime'
import type { SkyVisualState, ThemeMode } from './skyTime'

const modes: readonly ThemeMode[] = ['auto', 'daylight', 'sunset', 'night']
function readMode(): ThemeMode {
  try {
    const value = localStorage.getItem('sky-guide-theme')
    return modes.find(mode => mode === value) ?? 'auto'
  } catch { return 'auto' }
}
interface ThemeContextValue { mode: ThemeMode; visual: SkyVisualState; setMode: (mode: ThemeMode) => void }
const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState(readMode)
  const [time, setTime] = useState(() => new Date())
  const visual = useMemo(() => getVisualStateForMode(mode, time), [mode, time])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const sync = () => setTime(new Date())
    const visibility = () => {
      clearInterval(timer)
      document.documentElement.classList.toggle('sky-paused', document.hidden)
      if (!document.hidden && mode === 'auto') {
        sync()
        timer = setInterval(sync, 15000)
      }
    }
    const storage = (event: StorageEvent) => {
      if (event.key === 'sky-guide-theme') setModeState(readMode())
    }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('storage', storage)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('storage', storage)
      document.documentElement.classList.remove('sky-paused')
    }
  }, [mode])

  function setMode(next: ThemeMode) {
    setTime(new Date())
    setModeState(next)
    try { localStorage.setItem('sky-guide-theme', next) } catch { /* Session selection still works. */ }
  }
  return <ThemeContext.Provider value={{ mode, visual, setMode }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const theme = useContext(ThemeContext)
  if (!theme) throw new Error('useTheme requires ThemeProvider.')
  return theme
}

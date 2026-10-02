import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'

export function useSkyNavigation() {
  const navigate = useNavigate()
  const current = useRef<ViewTransition | null>(null)
  return (to: string, illuminate: () => void) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!reduced && typeof document.startViewTransition === 'function') {
      current.current?.skipTransition()
      flushSync(illuminate)
      const transition = document.startViewTransition(() => { flushSync(() => navigate(to)) })
      current.current = transition
      // Capture may be skipped by the browser; navigation has already happened.
      void transition.ready.catch(() => {})
    } else {
      illuminate()
      navigate(to)
    }
  }
}

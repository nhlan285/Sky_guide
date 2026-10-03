import { useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { skyNavigationDelay } from './navigationMotion'

export function useSkyNavigation() {
  const navigate = useNavigate()
  const current = useRef<ViewTransition | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const pending = useRef<(() => void) | null>(null)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finish = () => {
      if (!motion.matches) return
      clearTimeout(timer.current)
      current.current?.skipTransition()
      pending.current?.()
    }
    motion.addEventListener('change', finish)
    return () => {
      clearTimeout(timer.current)
      pending.current = null
      motion.removeEventListener('change', finish)
    }
  }, [])
  return (to: string, illuminate: () => void) => {
    clearTimeout(timer.current)
    current.current?.skipTransition()
    illuminate()
    const finish = () => {
      pending.current = null
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced && typeof document.startViewTransition === 'function') {
        const transition = document.startViewTransition(() => { flushSync(() => navigate(to)) })
        current.current = transition
        // Browsers can skip a capture; the update callback still navigates.
        void transition.ready.catch(() => {})
      } else navigate(to)
    }
    pending.current = finish
    const delay = skyNavigationDelay(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (delay === 0) finish()
    else timer.current = setTimeout(finish, delay)
  }
}

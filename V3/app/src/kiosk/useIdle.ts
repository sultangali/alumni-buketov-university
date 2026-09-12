import { useEffect, useRef } from 'react'

/** Fires `onIdle` after `ms` of no pointer/touch/key interaction; resets on activity. */
export function useIdle(ms: number, onIdle: () => void) {
  const cb = useRef(onIdle)
  cb.current = onIdle
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const reset = () => {
      clearTimeout(t)
      t = setTimeout(() => cb.current(), ms)
    }
    const evts = ['pointerdown', 'touchstart', 'keydown', 'wheel'] as const
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      clearTimeout(t)
      evts.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [ms])
}

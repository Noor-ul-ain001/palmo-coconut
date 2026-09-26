import { useEffect, useState } from 'react'
import { gsap } from './gsap'

// Sections opt into inverting the header by carrying `data-nav-dark="<top> <bottom>"`,
// two vw insets that shrink the section's own box. The header flips as soon as
// its mid-height line falls inside that shrunk box — measured every tick, so it
// stays correct through pinned and scrubbed sections where scroll position
// alone would lie.
function parseInsets(el) {
  const raw = el.getAttribute('data-nav-dark')
  if (!raw) return [0, 0]
  const [top, bottom] = raw.trim().split(/\s+/).map(Number)
  if (!Number.isFinite(top)) return [0, 0]
  return [top, Number.isFinite(bottom) ? bottom : top]
}

export function useNavDark({ band = 0 } = {}) {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const visible = new Set()
    let last = null

    const check = () => {
      const navHeight =
        band || document.querySelector('nav.fixed')?.getBoundingClientRect().height || 72
      const line = 0.5 * navHeight
      const vw = window.innerWidth / 100

      let isDark = false
      for (const el of visible) {
        const rect = el.getBoundingClientRect()
        const [top, bottom] = parseInsets(el)
        if (rect.top + top * vw <= line && rect.bottom - bottom * vw > line) {
          isDark = true
          break
        }
      }
      if (isDark !== last) {
        last = isDark
        setDark(isDark)
      }
    }

    // Only measure sections that are anywhere near the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target)
          else visible.delete(entry.target)
        }
      },
      { threshold: 0, rootMargin: '100px 0px 0px 0px' }
    )

    document.querySelectorAll('[data-nav-dark]').forEach((el) => observer.observe(el))

    gsap.ticker.add(check)
    check()

    return () => {
      observer.disconnect()
      gsap.ticker.remove(check)
    }
  }, [band])

  return dark
}

export default useNavDark

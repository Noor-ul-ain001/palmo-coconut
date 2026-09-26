import { useEffect, useState } from 'react'
import { reduced } from '../lib/gsap'

// One-shot hint that the footer is playable. It arms when the footer first
// scrolls into view and takes itself off the page once the CSS animation has
// finished, so it never sits in the DOM during play.
const LIFETIME = 2400

function SlashBanner({ zoneRef }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const zone = zoneRef?.current
    if (!zone || reduced()) return undefined

    let removeTimer = null

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          setVisible(true)
          removeTimer = setTimeout(() => setVisible(false), LIFETIME)
          observer.disconnect()
          break
        }
      },
      { threshold: [0, 0.15, 0.5] }
    )

    // Observing is deferred a beat so the footer's own layout has settled and
    // the banner cannot fire against a stale position.
    const armTimer = setTimeout(() => observer.observe(zone), 100)

    return () => {
      clearTimeout(armTimer)
      clearTimeout(removeTimer)
      observer.disconnect()
    }
  }, [zoneRef])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className="slash-banner pointer-events-none absolute inset-0 z-30 flex items-center justify-center overflow-hidden"
    >
      <span className="slash-scrim" />
      <span className="slash-line" />
      <div className="slash-stack relative flex flex-col items-center">
        <span className="relative block">
          <span className="slash-word slash-word--top font-khand">Slash Activated</span>
          <span className="slash-word slash-word--bottom font-khand">Slash Activated</span>
        </span>
        <span className="slash-sub font-inter">Swipe to slice</span>
      </div>
    </div>
  )
}

export default SlashBanner

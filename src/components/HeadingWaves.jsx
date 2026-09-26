import { useRef } from 'react'
import { gsap, useGSAP, reduced } from '../lib/gsap'

const WAVES = [
  { width: '10', opacity: '0.76', d: 'M20 145C90 145 120 110 150 70.0001C180 30.0001 230 20.0001 290 60.0001C250 40.0001 215 55.0001 205 90.0001C195 125 215 160 260 165C305 170 335 145 370 145' },
  { width: '7', opacity: '0.76', d: 'M285.001 65C245.001 70 225.001 105 235.001 135C245.001 165 275.001 175 305.001 165' },
]

// The hand-drawn wave between "The real" and "Source of" draws itself in
// when the heading arrives, stroke by stroke.
function HeadingWaves({ className = '', start = 'top 80%' }) {
  const ref = useRef(null)

  useGSAP(
    () => {
      const strokes = gsap.utils.toArray('path', ref.current)
      if (!strokes.length) return
      if (reduced()) {
        gsap.set(strokes, { drawSVG: '0% 100%' })
        return
      }
      gsap.fromTo(
        strokes,
        { drawSVG: '0% 0%' },
        {
          drawSVG: '0% 100%',
          duration: 0.9,
          ease: 'power2.out',
          stagger: 0.18,
          scrollTrigger: { trigger: ref.current, start, once: true },
        }
      )
    },
    { scope: ref }
  )

  return (
    <div ref={ref} className={className}>
      <div className="w-full">
        <svg
          className="h-full w-full object-contain"
          viewBox="0 0 400 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {WAVES.map((w, i) => (
            <path
              key={i}
              d={w.d}
              stroke="currentColor"
              strokeOpacity={w.opacity}
              strokeWidth={w.width}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    </div>
  )
}

export default HeadingWaves

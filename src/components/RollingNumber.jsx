import { useEffect, useRef } from 'react'
import { gsap, reduced } from '../lib/gsap'

const ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

// Odometer column that only ever rolls forward: the driving value keeps
// increasing and `% 10` picks the row, so 9 -> 0 scrolls through the
// duplicate trailing zero instead of snapping backwards.
function Digit({ value }) {
  const colRef = useRef(null)
  const state = useRef({ p: 0 })
  const started = useRef(false)
  const tween = useRef(null)

  useEffect(() => {
    const col = colRef.current
    if (!col) return

    const apply = () => {
      col.style.transform = `translateY(${-(state.current.p % 10)}em)`
    }

    if (!started.current || reduced()) {
      started.current = true
      state.current.p = value
      apply()
      return
    }

    const current = state.current.p
    let target = 10 * Math.floor(current / 10) + value
    while (target <= current + 0.001) target += 10

    tween.current?.kill()
    tween.current = gsap.to(state.current, {
      p: target,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
      onUpdate: apply,
    })
  }, [value])

  useEffect(() => () => tween.current?.kill(), [])

  return (
    <span className="rolling-number__digit" aria-hidden="true">
      <span className="rolling-number__col" ref={colRef}>
        {ROWS.map((d, i) => (
          <span className="rolling-number__row" key={i}>
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

function RollingNumber({ value }) {
  const safe = Math.max(0, Math.round(value) || 0)
  const digits = String(safe).split('').map(Number)

  return (
    <span className="rolling-number">
      <span className="sr-only">{safe}</span>
      {digits.map((d, i) => (
        <Digit value={d} key={`${digits.length}-${i}`} />
      ))}
    </span>
  )
}

export default RollingNumber

import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap, reduced } from '../lib/gsap'
import { useScrollLock } from '../lib/smoothScroll'
import { TREE_PATH } from './treePath'

const DIGIT_ROWS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]

// Every exit path must announce completion: the loader-cue registry gates the
// navbar drop-in, hero copy and section reveals, and none of those would ever
// fire on a warm (sessionStorage) or reduced-motion load otherwise.
let announced = false
function announceLoaderDone() {
  if (announced) return
  announced = true
  window.dispatchEvent(new Event('loaderComplete'))
  window.dispatchEvent(new Event('palmo:loader-done'))
}

// Odometer column that only rolls forward: the driving value keeps increasing
// and `% 10` picks the row, so 9 -> 0 scrolls through the duplicate trailing
// zero instead of snapping backwards.
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

    if (!started.current) {
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
    <span
      aria-hidden="true"
      className="relative inline-block overflow-hidden align-bottom tabular-nums leading-none"
      style={{ height: '1em', width: '0.48em' }}
    >
      <span className="block will-change-transform" ref={colRef}>
        {DIGIT_ROWS.map((d, i) => (
          <span
            key={i}
            className="flex items-center justify-center leading-none"
            style={{ height: '1em' }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  )
}

function Preloader() {
  const [percent, setPercent] = useState(0)
  const [visible, setVisible] = useState(true)

  const sectionRef = useRef(null)
  const fillGroupRef = useRef(null)
  const percentBoxRef = useRef(null)
  const maskRef = useRef(null)
  const fgLeftRef = useRef(null)
  const fgRightRef = useRef(null)
  const bgLeftRef = useRef(null)
  const bgRightRef = useRef(null)

  const finished = useRef(false)
  const lastPercent = useRef(0)
  const exitTimeline = useRef(null)

  useScrollLock(visible)

  const finish = useCallback(() => {
    if (finished.current) return
    finished.current = true

    if (!sectionRef.current) {
      announceLoaderDone()
      setVisible(false)
      return
    }

    gsap.set(sectionRef.current, { pointerEvents: 'none' })
    lastPercent.current = 100
    setPercent(100)

    const tl = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        announceLoaderDone()
        setVisible(false)
      },
    })
    exitTimeline.current = tl

    if (fillGroupRef.current) {
      tl.to(fillGroupRef.current, {
        attr: { transform: 'translate(0, 0)' },
        duration: 0.4,
        ease: 'power2.out',
      })
    }

    if (percentBoxRef.current) {
      tl.to(percentBoxRef.current, { autoAlpha: 0, y: 28, duration: 0.35, ease: 'power2.in' }, 0)
    }

    // The mark is revealed by sliding a gradient mask up over it.
    if (maskRef.current) {
      const w = { v: -36 }
      const applyWipe = () => maskRef.current.style.setProperty('--wipe', `${w.v}%`)
      applyWipe()
      tl.to(w, { v: 100, duration: 0.7, ease: 'power2.inOut', onUpdate: applyWipe }, '-=0.05')
    }

    const swing = { xPercent: 170, duration: 1.45, ease: 'power3.inOut' }
    if (fgLeftRef.current && fgRightRef.current) {
      tl.to(fgLeftRef.current, { ...swing, xPercent: -170, rotate: -5 }, '-=0.08')
      tl.to(fgRightRef.current, { ...swing, rotate: 5 }, '<')
    }
    if (bgLeftRef.current && bgRightRef.current) {
      tl.to(bgLeftRef.current, { ...swing, xPercent: -170, rotate: -5 }, '-=1.2')
      tl.to(bgRightRef.current, { ...swing, rotate: 5 }, '<')
    }

    // Released while the panels are most of the way open, so the page's own
    // entrance animations are already running as the doors finish parting.
    tl.add(announceLoaderDone, '-=0.55')
  }, [])

  useEffect(() => {
    if (sessionStorage.getItem('palmo-loaded')) {
      announceLoaderDone()
      setVisible(false)
      return undefined
    }

    if (reduced()) {
      sessionStorage.setItem('palmo-loaded', '1')
      announceLoaderDone()
      setVisible(false)
      return undefined
    }

    if (fillGroupRef.current) {
      gsap.set(fillGroupRef.current, { attr: { transform: 'translate(0, 860)' } })
    }

    const startedAt = Date.now()
    let s = 0
    let last = performance.now()
    let raf = requestAnimationFrame(function tick(now) {
      if (finished.current) return
      raf = requestAnimationFrame(tick)

      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      // Nothing real to await in this build, so the target is always 100 —
      // the curve matches the live site's fast-catch-up smoothing.
      s += (100 - s) * (1 - Math.exp(-6 * dt))
      if (100 - s < 0.4) s = 100

      const p = Math.round(s)
      if (p !== lastPercent.current) {
        lastPercent.current = p
        setPercent(p)
      }

      if (fillGroupRef.current) {
        fillGroupRef.current.setAttribute('transform', `translate(0, ${860 * (1 - s / 100)})`)
      }

      const elapsed = Date.now() - startedAt
      if (elapsed >= 3000 && (s >= 99.5 || elapsed >= 4000)) {
        cancelAnimationFrame(raf)
        sessionStorage.setItem('palmo-loaded', '1')
        finish()
      }
    })

    const failsafe = setTimeout(() => {
      sessionStorage.setItem('palmo-loaded', '1')
      finish()
    }, 25000)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(failsafe)
      exitTimeline.current?.kill()
    }
  }, [finish])

  if (!visible) return null

  const clamped = Math.min(100, Math.max(0, percent))
  const maskImage =
    'linear-gradient(to top, transparent 0%, transparent var(--wipe), #000 calc(var(--wipe) + 36%), #000 100%)'

  return (
    <section
      ref={sectionRef}
      id="loader"
      aria-hidden="true"
      className="fixed top-0 left-0 z-999 flex h-screen w-full items-center justify-center overflow-hidden max-md:h-dvh"
    >
      <div
        ref={bgLeftRef}
        className="absolute -top-[30dvh] left-0 h-[160dvh] w-[58%] will-change-transform z-1 origin-right bg-beige"
      />
      <div
        ref={bgRightRef}
        className="absolute -top-[30dvh] h-[160dvh] w-[58%] will-change-transform right-0 left-auto z-1 origin-left bg-beige"
      />
      <div
        ref={fgLeftRef}
        className="absolute -top-[30dvh] left-0 h-[160dvh] w-[58%] will-change-transform z-2 origin-right bg-foreground"
      />
      <div
        ref={fgRightRef}
        className="absolute -top-[30dvh] h-[160dvh] w-[58%] will-change-transform right-0 left-auto z-2 origin-left bg-foreground"
      />

      <div
        ref={maskRef}
        className="relative z-10"
        style={{
          '--wipe': '-36%',
          WebkitMaskImage: maskImage,
          maskImage,
          WebkitMaskSize: '100% 100%',
          maskSize: '100% 100%',
        }}
      >
        <svg
          viewBox="0 0 554 860"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="block w-[10vw] max-md:w-[36vw] overflow-visible will-change-transform"
          style={{ height: 'auto', transformOrigin: 'center center' }}
        >
          <defs>
            <clipPath id="loader-tree-clip">
              <path d={TREE_PATH} />
            </clipPath>
          </defs>
          <g clipPath="url(#loader-tree-clip)">
            <rect x="0" y="-10" width="554" height="870" fill="var(--beige)" opacity="0.15" />
            <g ref={fillGroupRef}>
              <rect x="0" y="0" width="554" height="860" fill="var(--beige)" />
            </g>
          </g>
          <path d={TREE_PATH} stroke="var(--beige)" strokeWidth="2" fill="none" opacity="0.3" />
        </svg>
      </div>

      <div
        ref={percentBoxRef}
        className="fixed bottom-8 left-8 z-10 flex items-end gap-1 text-beige max-md:bottom-[4dvh] max-md:left-1/2 max-md:-translate-x-1/2"
        style={{
          fontFamily: 'var(--font-khand)',
          fontWeight: 600,
          fontSize: 'clamp(3rem, 6vw, 5rem)',
        }}
      >
        <span className="inline-flex items-end leading-none tracking-[-0.06em]" aria-live="polite">
          <span className="sr-only">{clamped} percent loaded</span>
          <Digit value={Math.floor(clamped / 100)} />
          <Digit value={Math.floor((clamped % 100) / 10)} />
          <Digit value={clamped % 10} />
        </span>
        <span className="leading-none" style={{ fontSize: '0.4em' }}>
          %
        </span>
      </div>
    </section>
  )
}

export default Preloader

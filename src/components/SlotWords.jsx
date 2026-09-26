import { useEffect, useRef } from 'react'
import { gsap, useGSAP, ScrollTrigger, reduced } from '../lib/gsap'

// A vertical slot machine driven by scroll rather than a timer: the words
// are stacked with a fixed gap and the whole column is scrubbed upward,
// snapping to one word at a time so it never rests mid-swap.
function SlotWords({
  words,
  gap = 1,
  start = 'top 65%',
  end = 'top 35%',
  scrub = 0.6,
  className = '',
}) {
  const ref = useRef(null)
  const rebuild = useRef(null)

  useGSAP(
    () => {
      const root = ref.current
      if (!root) return undefined

      const slots = gsap.utils.toArray('.slot-word', root)
      if (slots.length < 2) return undefined

      if (reduced()) {
        gsap.set(slots, { y: 0, autoAlpha: 0 })
        gsap.set(slots[slots.length - 1], { autoAlpha: 1 })
        return undefined
      }

      let tl = null

      const build = () => {
        tl?.scrollTrigger?.kill()
        tl?.kill()

        // Re-measured every build: the gap is in vw and the slot height is
        // in em, so both move with the viewport.
        const gapPx = (window.innerWidth * gap) / 100
        const step = slots[0].offsetHeight + gapPx
        const total = (slots.length - 1) * step

        slots.forEach((el, i) => gsap.set(el, { y: i * step }))

        tl = gsap.timeline({
          scrollTrigger: {
            trigger: root,
            start,
            end,
            scrub,
            snap: {
              snapTo: 1 / (slots.length - 1),
              duration: 0.2,
              ease: 'power1.inOut',
            },
          },
          defaults: { ease: 'none' },
        })
        tl.to(slots, { y: (i) => i * step - total, duration: 1, ease: 'none' })
      }

      build()
      rebuild.current = build

      return () => {
        rebuild.current = null
        tl?.scrollTrigger?.kill()
        tl?.kill()
      }
    },
    { scope: ref, dependencies: [gap, start, end, scrub] }
  )

  // Width changes and the loader finishing both invalidate the measured
  // step, so the stack is rebuilt rather than left at a stale offset.
  useEffect(() => {
    let lastWidth = window.innerWidth
    let timer = null

    const onResize = () => {
      const w = window.innerWidth
      if (w === lastWidth) return
      lastWidth = w
      clearTimeout(timer)
      timer = setTimeout(() => {
        rebuild.current?.()
        ScrollTrigger.refresh()
      }, 150)
    }
    const onCue = () => {
      rebuild.current?.()
      ScrollTrigger.refresh()
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    window.addEventListener('loaderComplete', onCue)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.removeEventListener('loaderComplete', onCue)
    }
  }, [])

  return (
    <span
      ref={ref}
      className={`relative inline-block overflow-hidden align-middle isolate ${className}`}
      style={{ height: '0.8em', lineHeight: '0.8em', position: 'relative', top: '-0.06em' }}
    >
      <span className="grid">
        {words.map((word, i) => (
          <span
            key={word.text}
            aria-hidden={i < words.length - 1 ? 'true' : undefined}
            style={{ height: '0.8em' }}
            className={`slot-word col-start-1 row-start-1 flex items-center justify-center leading-none whitespace-nowrap will-change-transform px-[0.22em] rounded-[0.1em] ${word.className}`}
          >
            <span
              className="block"
              style={{ fontSize: '0.72em', lineHeight: 1, transform: 'translateY(0.06em)' }}
            >
              {word.text}
            </span>
          </span>
        ))}
      </span>
    </span>
  )
}

export default SlotWords

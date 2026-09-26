import { useRef } from 'react'
import { gsap, useGSAP, SplitText, reduced } from '../lib/gsap'
import { onLoaderCue } from '../lib/loaderCue'

function AnimatedTextBase({
  as: Tag = 'span',
  variant,
  children,
  className = '',
  delay = 0,
  stagger,
  from = 'start',
  duration,
  start = 'top 88%',
  maskPad,
  ...rest
}) {
  const ref = useRef(null)
  const isHeadingTag = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
    typeof Tag === 'string' ? Tag.toLowerCase() : ''
  )
  const resolvedVariant = variant || (isHeadingTag ? 'heading' : 'paragraph')

  useGSAP(
    () => {
      const el = ref.current
      if (!el) return

      if (reduced()) {
        gsap.set(el, { autoAlpha: 1 })
        return
      }

      let split = null
      let tween = null
      let done = false

      const run = () => {
        if (done) return null

        if (resolvedVariant === 'heading') {
          const s = SplitText.create(el, { type: 'lines,words,chars', mask: 'lines' })
          split = s
          if (maskPad) {
            s.masks?.forEach((m) => {
              gsap.set(m, { paddingLeft: maskPad, paddingRight: maskPad })
            })
          }
          gsap.set(s.chars, { yPercent: 140 })
          gsap.set(el, { autoAlpha: 1 })
          tween = gsap.to(s.chars, {
            yPercent: 0,
            duration: duration || 0.85,
            ease: 'power3.out',
            stagger: { each: stagger || 0.035, from },
            delay,
            scrollTrigger: { trigger: el, start, once: true },
            onComplete: () => {
              done = true
              split?.revert()
              split = null
              gsap.set(el, { autoAlpha: 1, clearProps: 'transform' })
            },
          })
        } else {
          const s = SplitText.create(el, { type: 'lines,words', mask: 'lines' })
          split = s
          gsap.set(s.lines, { yPercent: 140, opacity: 0 })
          gsap.set(el, { autoAlpha: 1 })
          tween = gsap.to(s.lines, {
            yPercent: 0,
            opacity: 1,
            duration: duration || 0.8,
            ease: 'power2.out',
            stagger: { each: stagger || 0.08, from },
            delay,
            scrollTrigger: { trigger: el, start, once: true },
            onComplete: () => {
              done = true
              split?.revert()
              split = null
              gsap.set(el, { autoAlpha: 1, clearProps: 'transform' })
            },
          })
        }

        return () => {
          tween?.scrollTrigger?.kill()
          tween?.kill()
          split?.revert()
        }
      }

      let cleanup = null
      const cancelCue = onLoaderCue(() => {
        cleanup = run()
      })

      let resizeTimer
      let lastWidth = window.innerWidth
      const onResize = () => {
        if (done) return
        const w = window.innerWidth
        if (w === lastWidth) return
        lastWidth = w
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          if (done) return
          cleanup?.()
          cleanup = run()
        }, 150)
      }
      window.addEventListener('resize', onResize)

      return () => {
        cancelCue()
        window.removeEventListener('resize', onResize)
        clearTimeout(resizeTimer)
        cleanup?.()
      }
    },
    { scope: ref, dependencies: [delay, duration, stagger, from, start, maskPad, resolvedVariant] }
  )

  return (
    <Tag ref={ref} className={`invisible ${className}`} {...rest}>
      {children}
    </Tag>
  )
}

export function AnimatedHeading({ as = 'h2', children, className = '', delay = 0, ...rest }) {
  return (
    <AnimatedTextBase
      as={as}
      variant="heading"
      className={className}
      delay={delay}
      {...rest}
    >
      {children}
    </AnimatedTextBase>
  )
}

export function AnimatedParagraph({ as = 'p', children, className = '', delay = 0, ...rest }) {
  return (
    <AnimatedTextBase
      as={as}
      variant="paragraph"
      className={className}
      delay={delay}
      {...rest}
    >
      {children}
    </AnimatedTextBase>
  )
}

export default AnimatedTextBase

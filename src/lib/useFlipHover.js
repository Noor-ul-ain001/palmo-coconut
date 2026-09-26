import { useEffect } from 'react'
import { gsap, reduced } from './gsap'

// The site's shared "flip word" hover: letters roll up one after another
// rather than all together, and roll back out from the far end so the
// exit reads as a separate gesture instead of a rewind.
export function useFlipHover(scopeRef, { trigger = scopeRef, onEnter, onLeave } = {}) {
  useEffect(() => {
    const el = trigger?.current
    const scope = scopeRef?.current
    if (!el || !scope) return undefined

    const chars = gsap.utils.toArray('[data-char]', scope)
    if (!chars.length && !onEnter) return undefined

    const isReduced = reduced()

    const enter = () => {
      if (isReduced) return
      gsap.killTweensOf(chars)
      gsap.to(chars, {
        yPercent: -50,
        duration: 0.5,
        ease: 'power3.out',
        stagger: { each: 0.018, from: 'start' },
      })
      onEnter?.()
    }

    const leave = () => {
      if (isReduced) return
      gsap.killTweensOf(chars)
      gsap.to(chars, {
        yPercent: 0,
        duration: 0.45,
        ease: 'power3.out',
        stagger: { each: 0.015, from: 'end' },
      })
      onLeave?.()
    }

    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointerleave', leave)
    el.addEventListener('focus', enter)
    el.addEventListener('blur', leave)

    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointerleave', leave)
      el.removeEventListener('focus', enter)
      el.removeEventListener('blur', leave)
      gsap.killTweensOf(chars)
    }
  }, [scopeRef, trigger, onEnter, onLeave])
}

export default useFlipHover

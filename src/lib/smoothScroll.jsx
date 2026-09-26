import { createContext, useContext, useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, reduced } from './gsap'

const LenisContext = createContext(null)

// Module-level handle as well as context: the 3D scroll controller lives
// inside an r3f <Canvas>, which does not share the React tree's context.
let activeLenis = null

export function getLenis() {
  return activeLenis
}

// Jump the page without Lenis animating back to where it thinks it was.
export function hardScrollTo(y) {
  if (activeLenis) activeLenis.scrollTo(y, { immediate: true, force: true })
  else window.scrollTo(0, y)
}

// Lenis drives the page; GSAP's ticker drives Lenis; ScrollTrigger updates
// off Lenis' scroll event. Wiring it in that single direction is what keeps
// scrubbed timelines (the coconut sequence especially) from jittering.
export function SmoothScrollProvider({ children }) {
  const [lenis, setLenis] = useState(null)

  useEffect(() => {
    if (reduced()) return undefined

    const instance = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Touch keeps native momentum: Lenis-smoothed touch fights the OS
      // and makes the pinned 3D section feel laggy on phones.
      syncTouch: false,
      touchMultiplier: 1.6,
    })

    instance.on('scroll', ScrollTrigger.update)

    const raf = (time) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    // Lenis already owns frame pacing; GSAP's lag smoothing on top of it
    // causes a visible catch-up jump after a stalled frame.
    gsap.ticker.lagSmoothing(0)

    activeLenis = instance
    setLenis(instance)

    return () => {
      gsap.ticker.remove(raf)
      gsap.ticker.lagSmoothing(500, 33)
      instance.destroy()
      activeLenis = null
      setLenis(null)
    }
  }, [])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}

export function useLenis() {
  return useContext(LenisContext)
}

// Used by every overlay that needs to freeze the page (menu, basket,
// preloader, footer game). Falls back to overflow:hidden when Lenis is off.
export function useScrollLock(locked) {
  const lenis = useLenis()

  useEffect(() => {
    if (!locked) return undefined

    lenis?.stop()
    const previousOverflow = document.body.style.overflow
    const previousTouch = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      lenis?.start()
      document.body.style.overflow = previousOverflow
      document.body.style.touchAction = previousTouch
    }
  }, [locked, lenis])
}

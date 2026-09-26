import { useRef } from 'react'
import { gsap, useGSAP, reduced } from './gsap'
import usePointerTilt from './usePointerTilt'

// Continuous idle sway for the palm-branch SVGs: the crown rocks gently
// while each leaf sways on its own independent, slightly randomized loop.
// On top of that the whole branch leans toward the pointer (or the device's
// tilt on mobile), which is what makes it feel physically present rather
// than a looping decoration.
export function usePalmSway(crownOrigin = '300 560', leafOrigin = '277 233', lean = 1) {
  const scopeRef = useRef(null)
  const tilt = usePointerTilt()

  useGSAP(
    () => {
      if (reduced()) return undefined

      const leaves = gsap.utils.toArray('[data-leaf]', scopeRef.current)

      gsap.to('[data-crown]', {
        rotation: 6,
        transformOrigin: '50% 50%',
        svgOrigin: crownOrigin,
        duration: 3.5,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1,
      })

      leaves.forEach((leaf, i) => {
        gsap.to(leaf, {
          rotation: (i % 2 === 0 ? 1 : -1) * gsap.utils.random(2.5, 4.5),
          svgOrigin: leafOrigin,
          duration: gsap.utils.random(2.6, 3.8),
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          delay: 0.15 * i,
        })
      })

      if (!lean) return undefined

      const branch = scopeRef.current?.querySelector('[data-lean]')
      if (!branch) return undefined

      gsap.set(branch, { svgOrigin: crownOrigin })

      // quickTo keeps one reusable tween per property, so following the
      // pointer never allocates a tween per frame.
      const setRotation = gsap.quickTo(branch, 'rotation', { duration: 0.9, ease: 'power3.out' })
      const setX = gsap.quickTo(branch, 'x', { duration: 1.1, ease: 'power3.out' })
      const setY = gsap.quickTo(branch, 'y', { duration: 1.1, ease: 'power3.out' })
      const setScales = leaves.map((leaf) =>
        gsap.quickTo(leaf, 'scale', { duration: 1.1, ease: 'power3.out' })
      )

      const follow = () => {
        const { x, y } = tilt.current
        setRotation(5 * x * lean)
        setX(14 * x * lean)
        setY(8 * y * lean)
        setScales.forEach((set, i) => {
          set(1 + x * (i % 2 === 0 ? 1 : -1) * 0.03 * lean)
        })
      }

      gsap.ticker.add(follow)

      return () => {
        gsap.ticker.remove(follow)
      }
    },
    { scope: scopeRef, dependencies: [crownOrigin, leafOrigin, lean] }
  )

  return scopeRef
}

export default usePalmSway

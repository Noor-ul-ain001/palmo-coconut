import { Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { MathUtils } from 'three'
import { CanModel } from './CoconutScene/CanModel'
import { ScrollTrigger, reduced } from '../lib/gsap'
import { HDRI } from '../lib/scene'

const deg = MathUtils.degToRad

// The can rides in on scroll and leans toward the viewer while its card is
// hovered. Both are driven here in the render loop rather than by tweening
// React state, so neither one can stall the r3f frame.
function CanRig({ texture, revealRef, hoverRef, spinRef, autoSpin }) {
  const group = useRef(null)
  const hover = useRef(0)
  const spin = useRef(0)

  useFrame((_, delta) => {
    const g = group.current
    if (!g) return
    const dt = Math.min(delta, 1 / 30)

    const reveal = revealRef?.current ?? 1
    // Eased so the last third of the scroll range does most of the settling.
    const eased = 1 - Math.pow(1 - reveal, 3)

    const target = hoverRef?.current ?? 0
    hover.current += (target - hover.current) * dt * 6

    // Each flavour step bumps spinRef by one, and the can eases a half turn
    // toward it — so switching reads as the can rotating to its new face
    // rather than the label simply swapping.
    if (spinRef) {
      const spinTarget = spinRef.current * Math.PI
      spin.current += (spinTarget - spin.current) * Math.min(1, dt * 5)
      g.rotation.y = spin.current
    }

    g.position.y = MathUtils.lerp(-1.15, 0, eased) + hover.current * 0.08
    g.rotation.z = deg(MathUtils.lerp(-16, 0, eased))
    g.rotation.x = deg(MathUtils.lerp(22, 0, eased)) - hover.current * deg(9)
    g.scale.setScalar(MathUtils.lerp(0.72, 1, eased) + hover.current * 0.06)
  })

  return (
    <group ref={group}>
      <CanModel texture={texture} autoSpin={autoSpin} />
    </group>
  )
}

function Can3D({ texture, className, hoverRef, spinRef, autoSpin = true }) {
  const wrapRef = useRef(null)
  const revealRef = useRef(1)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined

    if (reduced()) {
      revealRef.current = 1
      return undefined
    }

    revealRef.current = 0
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 115%',
      end: 'top 70%',
      scrub: true,
      onUpdate: (self) => {
        revealRef.current = self.progress
      },
    })

    // A card already sitting above the fold on load would otherwise stay
    // stuck at progress 0 until the first scroll event.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
      revealRef.current = 1
    } else {
      revealRef.current = trigger.progress
    }

    return () => trigger.kill()
  }, [])

  return (
    <div className={className} ref={wrapRef}>
      <Canvas
        camera={{ position: [0, 0, 4.5], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.55} />
          <Environment files={HDRI} environmentIntensity={0.55} />
          <CanRig
            texture={texture}
            revealRef={revealRef}
            hoverRef={hoverRef}
            spinRef={spinRef}
            autoSpin={autoSpin}
          />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default Can3D

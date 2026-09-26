import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment } from '@react-three/drei'
import { MathUtils } from 'three'
import { gsap } from '../../lib/gsap'
import usePointerTilt from '../../lib/usePointerTilt'
import { HDRI } from '../../lib/scene'
import { CoconutModel } from './CoconutModel'
import { SceneRotationController } from './SceneRotationController'

const deg = MathUtils.degToRad

// Gyro/pointer parallax on the whole rig, same normalization as the site's
// real pointer/gyro hook.
function TiltGroup({ children, intensity = 8 }) {
  const ref = useRef()
  const tilt = usePointerTilt()

  useFrame((_, delta) => {
    if (!ref.current) return
    const dt = Math.min(delta, 1 / 30)
    const targetX = -tilt.current.y * deg(intensity)
    const targetY = tilt.current.x * deg(intensity)
    ref.current.rotation.x += (targetX - ref.current.rotation.x) * dt * 3
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * dt * 3
  })

  return <group ref={ref}>{children}</group>
}

// Brief random micro-jitter, started/stopped via controlRef during the
// crack-open burst for a "shaken before opening" flourish.
function ShakeJitterGroup({ children, controlRef, intensity = 1 }) {
  const ref = useRef()

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const state = { value: 0 }
    const timeline = gsap
      .timeline({ repeat: -1, repeatRefresh: true, paused: true })
      .to(el.position, {
        x: () => gsap.utils.random(-0.018, 0.018) * intensity * state.value,
        y: () => gsap.utils.random(-0.018, 0.018) * intensity * state.value,
        duration: 0.04,
        ease: 'sine.inOut',
      })
      .to(
        el.rotation,
        {
          x: () => deg(gsap.utils.random(-1.6, 1.6)) * intensity * state.value,
          y: () => deg(gsap.utils.random(-1.6, 1.6)) * intensity * state.value,
          z: () => deg(gsap.utils.random(-2.2, 2.2)) * intensity * state.value,
          duration: 0.04,
          ease: 'sine.inOut',
        },
        '<'
      )

    if (controlRef) {
      controlRef.current = {
        start: () => {
          timeline.play()
          gsap.to(state, { value: 1, duration: 0.6, ease: 'power2.out', overwrite: true })
        },
        stop: () => {
          gsap.to(state, {
            value: 0,
            duration: 0.5,
            ease: 'power2.in',
            overwrite: true,
            onComplete: () => {
              timeline.pause()
              gsap.to(el.position, { x: 0, y: 0, z: 0, duration: 0.3 })
              gsap.to(el.rotation, { x: 0, y: 0, z: 0, duration: 0.3 })
            },
          })
        },
      }
    }

    return () => {
      timeline.kill()
      gsap.killTweensOf(state)
      gsap.killTweensOf(el.position)
      gsap.killTweensOf(el.rotation)
      if (controlRef) controlRef.current = null
    }
  }, [controlRef, intensity])

  return <group ref={ref}>{children}</group>
}

export function CoconutScene({ children }) {
  const coconut = useRef()
  const coconutWithWater = useRef()
  const coconutEmpty = useRef()
  const coconutMilk = useRef()
  const can = useRef()
  const shakeControl = useRef(null)

  const trackRef = useRef(null)
  const contentRef = useRef(null)
  const [contentHeight, setContentHeight] = useState(null)
  const [inView, setInView] = useState(true)

  // The track is exactly as tall as the content stacked inside it; 620vh is
  // only the pre-measurement fallback.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return undefined
    const measure = () => setContentHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={trackRef}
      id="coconut-sequence"
      className="z-1 w-full relative"
      style={{ height: contentHeight ? `${contentHeight}px` : '620vh' }}
    >
      <div
        id="coconut-canvas-pin"
        className="h-screen sticky z-2 pointer-events-none! left-0 top-0 w-full"
      >
        <Canvas
          frameloop={inView ? 'always' : 'never'}
          dpr={[1, 2]}
          camera={{ position: [0, 0, 5], fov: 45 }}
          className="h-full w-full"
          eventSource={trackRef}
          eventPrefix="client"
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.4} />
            <TiltGroup intensity={15}>
              <ShakeJitterGroup controlRef={shakeControl} intensity={1.6}>
                <CoconutModel
                  coconut={coconut}
                  coconutWithWater={coconutWithWater}
                  coconutEmpty={coconutEmpty}
                  coconutMilk={coconutMilk}
                  can={can}
                />
              </ShakeJitterGroup>
            </TiltGroup>
            <Environment files={HDRI} environmentIntensity={0.4} />
            <SceneRotationController
              coconut={coconut}
              coconutWithWater={coconutWithWater}
              coconutEmpty={coconutEmpty}
              coconutMilk={coconutMilk}
              can={can}
              shakeControl={shakeControl}
            />
          </Suspense>
        </Canvas>
      </div>
      <div
        ref={contentRef}
        className="h-fit w-full max-md:overflow-x-clip absolute pointer-events-auto top-0 left-0"
      >
        {children}
      </div>
    </div>
  )
}

export default CoconutScene

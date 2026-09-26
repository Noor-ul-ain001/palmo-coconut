import { useLayoutEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { Box3, MathUtils, Vector3 } from 'three'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { getLenis, hardScrollTo } from '../../lib/smoothScroll'
import { SEQ, emitSeq } from '../../lib/coconutSeq'
import { RIG_Z } from './CoconutModel'

const deg = MathUtils.degToRad

// How tall the finished can stands relative to the coconut it replaces.
const CAN_TO_COCONUT = 1.1

// Where the coconut group settles once the burst finishes.
const COCONUT_SETTLE_Z = deg(-60)

// The can inherits the rig's Z rotation and the coconut's settle rotation, so
// on its own it ends up lying flat along world X. Cancelling both stands it
// up; the extra half turn is because can1.glb is authored with its Top cap at
// -Z, so without it the can stands on its lid. Derived rather than written as
// a literal, so it stays correct if either angle is ever retuned.
const CAN_UPRIGHT_Z = -(COCONUT_SETTLE_Z + RIG_Z) + Math.PI

// The can's own scale cannot be a fixed number: it hangs inside the coconut
// group, which is scaled 12 on desktop and 7 below 1025px, and the two models
// have unrelated native sizes. Measuring both and solving for the ratio makes
// the result identical at every breakpoint — the parent scale cancels out
// because both boxes are measured in the same parent's world space.
function fitCanScale(can, reference, ratio = CAN_TO_COCONUT) {
  const size = new Vector3()

  const previous = can.scale.clone()
  can.scale.setScalar(1)
  can.updateWorldMatrix(true, true)
  const canBox = new Box3().setFromObject(can)
  can.scale.copy(previous)

  if (canBox.isEmpty()) return 0.25
  canBox.getSize(size)
  // Largest dimension rather than height: the can is rotated onto its side
  // inside the rig, so its long axis is not the world Y axis.
  const canSpan = Math.max(size.x, size.y, size.z)
  if (!canSpan) return 0.25

  const refBox = new Box3().setFromObject(reference)
  if (refBox.isEmpty()) return 0.25
  refBox.getSize(size)
  const refSpan = Math.max(size.x, size.y, size.z)
  if (!refSpan) return 0.25

  return (refSpan * ratio) / canSpan
}

// Burst trigger point: right when the can-spin runway marker is about to
// reach the top of the viewport, so the spin gets exactly one viewport's
// worth of scroll distance before the sequence track ends. Falls back to
// 83.33% through the track if no runway marker is present.
function getBurstScrollY() {
  const sequence = document.getElementById('coconut-sequence')
  if (!sequence) return 0
  const runway = document.querySelector('[data-can-spin-runway]')
  const sequenceTop = sequence.getBoundingClientRect().top + window.scrollY
  if (runway) {
    return Math.max(sequenceTop, runway.getBoundingClientRect().top + window.scrollY - window.innerHeight)
  }
  return sequenceTop + (sequence.offsetHeight - window.innerHeight) * 0.8333
}

function createBurstController({ coconut, coconutWithWater, coconutEmpty, coconutMilk, can, shakeControl, canScale }) {
  let timeline = null
  let isOpen = false
  let scrollLocked = false
  let suppressed = false
  let cover = null

  const emit = (event, detail) => {
    if (!suppressed) emitSeq(event, detail)
  }
  const timeRemaining = () => (timeline ? (timeline.duration() - timeline.time()) / timeline.timeScale() : 0)

  function showCover() {
    const sequence = document.getElementById('coconut-sequence')
    if (sequence) gsap.set(sequence, { zIndex: 30 })
    if (!cover) {
      cover = document.createElement('div')
      cover.dataset.coconutBurstCover = ''
      gsap.set(cover, {
        position: 'fixed',
        inset: 0,
        zIndex: 20,
        backgroundColor: 'var(--background)',
        pointerEvents: 'none',
      })
      document.body.appendChild(cover)
    }
  }

  function hideCover() {
    const sequence = document.getElementById('coconut-sequence')
    if (sequence) gsap.set(sequence, { clearProps: 'zIndex' })
    cover?.remove()
    cover = null
  }

  function lockScroll(targetScroll) {
    if (scrollLocked) return
    scrollLocked = true
    showCover()
    if (typeof targetScroll === 'number') {
      const clamped = Math.min(
        Math.max(targetScroll, 0),
        Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
      )
      hardScrollTo(clamped)
    }
    // Freeze smooth scrolling outright for the length of the burst so
    // momentum carried in from the previous section cannot scrub past it.
    getLenis()?.stop()
    const pin = document.getElementById('coconut-canvas-pin')
    if (pin) gsap.set(pin, { position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 2 })
  }

  function unlockScroll() {
    if (!scrollLocked) return
    scrollLocked = false
    getLenis()?.start()
    const pin = document.getElementById('coconut-canvas-pin')
    if (pin) gsap.set(pin, { clearProps: 'position,top,left,width,height,zIndex' })
  }

  return {
    open(targetScroll) {
      if (isOpen) return
      isOpen = true
      timeline?.kill()
      lockScroll(targetScroll)
      suppressed = false
      shakeControl?.current?.start()
      emit(SEQ.shake)

      timeline = gsap.timeline({ defaults: { ease: 'power2.inOut', overwrite: false }, onComplete: unlockScroll })
        .to(coconutMilk.current.scale, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'power2.in' })
        .to(
          coconutEmpty.current.position,
          { x: 1.35, duration: 1.6, ease: 'power2.in', onStart: () => emit(SEQ.burst, { budget: timeRemaining() }) },
          '>-0.2'
        )
        .to(coconutWithWater.current.position, { x: -1.35, duration: 1.6, ease: 'power2.in' }, '<')
        .add(() => shakeControl?.current?.stop(), '<')
        .fromTo(
          can.current.scale,
          { x: 0, y: 0, z: 0 },
          {
            x: canScale,
            y: canScale,
            z: canScale,
            duration: 1.4,
            ease: 'back.out(1.6)',
            onStart: () => emit(SEQ.can, { budget: timeRemaining() }),
          },
          '<0.3'
        )
        .set(can.current.rotation, { x: 0, y: 0, z: CAN_UPRIGHT_Z }, '<')
        .to(
          coconut.current.rotation,
          { z: COCONUT_SETTLE_Z, duration: 1.4, ease: 'back.out(1.6)' },
          '<'
        )
    },

    close(onDone) {
      if (!isOpen) {
        onDone?.()
        return
      }
      isOpen = false
      suppressed = true
      emitSeq(SEQ.reset)
      shakeControl?.current?.stop()
      lockScroll()
      const finish = () => {
        unlockScroll()
        onDone?.()
      }
      if (timeline) {
        timeline.eventCallback('onReverseComplete', finish)
        timeline.timeScale(1.2).reverse()
      } else finish()
    },

    kill() {
      timeline?.kill()
      timeline = null
      isOpen = false
      suppressed = true
      emitSeq(SEQ.reset)
      shakeControl?.current?.stop()
      unlockScroll()
      hideCover()
    },

    showCover,
    hideCover,
    isOpen: () => isOpen,
  }
}

export function SceneRotationController({ coconut, coconutWithWater, coconutEmpty, coconutMilk, can, shakeControl }) {
  const { camera } = useThree()

  useLayoutEffect(() => {
    if (!coconut.current || !coconutEmpty.current || !coconutWithWater.current || !coconutMilk.current || !can.current) {
      return undefined
    }

    const originalCameraZ = camera.position.z
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    hardScrollTo(0)
    gsap.set(can.current.scale, { x: 0, y: 0, z: 0 })

    // Measured against the whole coconut before anything has moved.
    const canScale = fitCanScale(can.current, coconut.current)

    const burst = createBurstController({
      coconut,
      coconutWithWater,
      coconutEmpty,
      coconutMilk,
      can,
      shakeControl,
      canScale,
    })

    // Idle scroll-scrubbed rotate/dolly across the Hero -> Benefits span,
    // ending back near a resting tilt right before the burst point.
    const rotation = gsap.timeline({
      scrollTrigger: { trigger: '#coconut-sequence', start: 'top top', end: () => getBurstScrollY(), scrub: true },
    })
    rotation.to(coconut.current.rotation, { y: deg(90), z: deg(-10), x: deg(-10), duration: 1, ease: 'power2.inOut' })
    rotation.to(coconutEmpty.current.position, { x: 1, duration: 1.5, ease: 'power2.inOut' }, '<+.5')
    rotation.to(coconutEmpty.current.rotation, { x: deg(-360), y: deg(120.6), duration: 1.5, ease: 'power2.inOut' }, '<')
    rotation.to(camera.position, { z: 3.5, duration: 1, ease: 'power2.inOut' }, '<')
    rotation.to(coconutWithWater.current.rotation, { z: deg(8), x: deg(-365), duration: 1, ease: 'power2.inOut' }, '<')
    rotation.to(coconutWithWater.current, { duration: 0.5 })
    rotation.to(coconut.current.rotation, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' })
    rotation.to(camera.position, { z: originalCameraZ, duration: 1, ease: 'power2.inOut' }, '<')
    rotation.to(coconutEmpty.current.position, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' }, '<')
    rotation.to(coconutEmpty.current.rotation, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' }, '<')
    rotation.to(coconutWithWater.current.rotation, { x: 0, y: 0, z: 0, duration: 1, ease: 'power2.inOut' }, '<')
    rotation.to(coconut.current.rotation, { z: deg(30) })

    const rotationTrigger = rotation.scrollTrigger

    const coverTrigger = ScrollTrigger.create({
      trigger: '#coconut-sequence',
      start: 'top top',
      endTrigger: '#introduction',
      end: 'top top',
      onToggle: (self) => (self.isActive ? burst.showCover() : burst.hideCover()),
    })

    const burstTrigger = ScrollTrigger.create({
      trigger: '#coconut-sequence',
      start: 'top top',
      end: () => getBurstScrollY(),
      onLeave: (self) => {
        rotationTrigger.disable(false)
        gsap.set(coconut.current.rotation, { x: 0, y: 0, z: deg(30) })
        gsap.set(coconutEmpty.current.position, { x: 0, y: 0, z: 0 })
        gsap.set(coconutEmpty.current.rotation, { x: 0, y: 0, z: 0 })
        gsap.set(coconutWithWater.current.rotation, { x: 0, y: 0, z: 0 })
        gsap.set(coconutWithWater.current.position, { x: 0, y: 0, z: 0 })
        gsap.set(camera.position, { z: originalCameraZ })
        burst.open(self.end + 1)
      },
      onEnterBack: () => {
        gsap.set(can.current.rotation, { x: 0 })
        burst.close(() => {
          rotationTrigger.enable(false)
          rotationTrigger.update()
        })
      },
    })

    const spin = gsap.timeline({
      scrollTrigger: { trigger: '#coconut-sequence', start: () => getBurstScrollY(), end: 'bottom bottom', scrub: 0.6 },
    })
    // X, not Z: with the can stood upright, rotating Z tips it end over end,
    // while X turns it on its own axis like a bottle on a turntable.
    spin.fromTo(can.current.rotation, { x: 0 }, { x: deg(720), ease: 'none', duration: 1 })

    return () => {
      coverTrigger.kill()
      burstTrigger.kill()
      spin.scrollTrigger?.kill()
      spin.kill()
      rotation.kill()
      burst.kill()
    }
  }, [coconut, coconutWithWater, coconutEmpty, coconutMilk, can, shakeControl, camera])

  return null
}

export default SceneRotationController

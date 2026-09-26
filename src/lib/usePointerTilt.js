import { useEffect, useRef } from 'react'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

// iOS gates DeviceOrientationEvent behind a permission prompt that must be
// triggered by a user gesture. This queues any number of "attach" callbacks
// and fires them all once permission is resolved, requesting only once.
let permissionState = 'unknown'
let permissionPending = false
const waiters = new Set()
const gestureEvents = ['touchend', 'pointerup', 'click', 'keydown']
let listening = false

function requestPermission() {
  if (permissionPending || permissionState === 'granted') return
  permissionPending = true
  DeviceOrientationEvent.requestPermission()
    .then((result) => {
      permissionPending = false
      permissionState = result === 'granted' ? 'granted' : 'denied'
      stopListening()
      if (permissionState === 'granted') for (const cb of [...waiters]) cb()
    })
    .catch(() => {
      permissionPending = false
    })
}

function stopListening() {
  if (!listening) return
  listening = false
  for (const evt of gestureEvents) window.removeEventListener(evt, requestPermission)
}

function waitForPermission(cb) {
  if (permissionState === 'granted') {
    cb()
    return () => {}
  }
  if (permissionState === 'denied') return () => {}
  waiters.add(cb)
  if (!listening && permissionState === 'unknown') {
    listening = true
    for (const evt of gestureEvents) window.addEventListener(evt, requestPermission, { passive: true })
  }
  return () => waiters.delete(cb)
}

// Normalizes pointer position and device tilt to the same -1..1 (x, y)
// space, matching the real site's hook exactly (same beta/gamma -> pitch/roll
// remap per screen orientation, same /25 sensitivity divisor).
export default function usePointerTilt({ onChange, enabled = true } = {}) {
  const pos = useRef({ x: 0, y: 0 })
  const cbRef = useRef(onChange)

  useEffect(() => {
    cbRef.current = onChange
  })

  useEffect(() => {
    if (!enabled) return undefined

    const setPos = (x, y) => {
      pos.current.x = x
      pos.current.y = y
      cbRef.current?.(x, y)
    }

    const onPointerMove = (e) => {
      setPos((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1)
    }
    window.addEventListener('pointermove', onPointerMove, { passive: true })

    let detachOrientation = () => {}
    let cancelPermissionWait = () => {}

    if ('DeviceOrientationEvent' in window) {
      let baseline = null

      const onOrientation = (ev) => {
        const { beta, gamma } = ev
        if (beta == null || gamma == null) return

        const angle = screen.orientation?.angle ?? window.orientation ?? 0
        let pitch = beta
        let roll = gamma
        if (angle === 90) {
          pitch = -gamma
          roll = beta
        } else if (angle === 180) {
          pitch = -beta
          roll = -gamma
        } else if (angle === 270 || angle === -90) {
          pitch = gamma
          roll = -beta
        }

        if (!baseline) baseline = { pitch, roll }
        setPos(clamp((roll - baseline.roll) / 25, -1, 1), clamp((pitch - baseline.pitch) / 25, -1, 1))
      }

      const onOrientationChange = () => {
        baseline = null
      }

      const attach = () => {
        window.addEventListener('deviceorientation', onOrientation)
        window.addEventListener('orientationchange', onOrientationChange)
        detachOrientation = () => {
          window.removeEventListener('deviceorientation', onOrientation)
          window.removeEventListener('orientationchange', onOrientationChange)
        }
      }

      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        cancelPermissionWait = waitForPermission(attach)
      } else {
        attach()
      }
    }

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      detachOrientation()
      cancelPermissionWait()
    }
  }, [enabled])

  return pos
}

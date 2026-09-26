import { useEffect, useRef } from 'react'
import { reduced } from '../lib/gsap'

const FRUITS = [
  '/fruits/coconut.webp',
  '/fruits/guava.webp',
  '/fruits/lychee.webp',
  '/fruits/pineapple.webp',
  '/fruits/strawberry.webp',
  '/fruits/watermolon.webp',
]

const GRAVITY = 1500 // px/s², tuned so a lob peaks around two thirds height
const SPAWN_MIN = 0.55
const SPAWN_MAX = 1.15
const TRAIL_LIFE = 0.28 // seconds a slice-trail point stays visible
const BOMB_CHANCE = 0.16 // roughly one in six lobs is a bomb

// Bombs are drawn rather than loaded: a dark sphere with a highlight and a lit
// fuse reads clearly at any size and costs no extra request.
function drawBomb(ctx, size, t) {
  const r = size / 2
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2)
  ctx.fillStyle = '#2A2118'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(-r * 0.26, -r * 0.28, r * 0.2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(r * 0.28, -r * 0.62)
  ctx.quadraticCurveTo(r * 0.72, -r * 0.95, r * 0.5, -r * 1.25)
  ctx.strokeStyle = '#8A6B3A'
  ctx.lineWidth = Math.max(1.5, r * 0.12)
  ctx.lineCap = 'round'
  ctx.stroke()

  // Spark flickers off the frame clock so every bomb is slightly out of phase.
  const spark = 0.6 + 0.4 * Math.sin(t * 14)
  ctx.beginPath()
  ctx.arc(r * 0.5, -r * 1.28, r * 0.16 * spark, 0, Math.PI * 2)
  ctx.fillStyle = '#FFB648'
  ctx.fill()
}

// Canvas-based fruit slicer: fruit is lobbed up from below the fold and cut by
// dragging the pointer through it. Everything lives in one rAF loop against a
// device-pixel-scaled canvas, so no DOM node is created per piece.
function FooterGame({ onScore, onBomb, frozen }) {
  const canvasRef = useRef(null)
  const scoreRef = useRef(onScore)
  const bombRef = useRef(onBomb)
  const frozenRef = useRef(frozen)

  useEffect(() => {
    scoreRef.current = onScore
    bombRef.current = onBomb
    frozenRef.current = frozen
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || reduced()) return undefined

    const ctx = canvas.getContext('2d')
    const images = FRUITS.map((src) => {
      const img = new Image()
      img.src = src
      return img
    })

    let width = 0
    let height = 0
    let dpr = 1

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const pieces = []
    const trail = []
    let spawnIn = 0.4
    let running = true
    let last = performance.now()

    const spawn = () => {
      const fromLeft = Math.random() < 0.5
      const isBomb = Math.random() < BOMB_CHANCE
      const size = width * (0.05 + Math.random() * 0.035)
      // Aim the lob so it crests inside the visible area regardless of height.
      const peak = height * (0.45 + Math.random() * 0.25)
      const vy = -Math.sqrt(2 * GRAVITY * peak)
      pieces.push({
        x: fromLeft ? width * (0.08 + Math.random() * 0.25) : width * (0.67 + Math.random() * 0.25),
        y: height + size,
        vx: (fromLeft ? 1 : -1) * width * (0.04 + Math.random() * 0.06),
        vy,
        size,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 3,
        img: isBomb ? null : images[Math.floor(Math.random() * images.length)],
        isBomb,
        sliced: false,
        alpha: 1,
        counted: false,
      })
    }

    // A cut is registered when the segment travelled since the last pointer
    // sample passes within a fruit's radius — cheaper and far more forgiving
    // than testing the single current point.
    const sliceAt = (x1, y1, x2, y2) => {
      for (const p of pieces) {
        if (p.sliced) continue
        const dx = x2 - x1
        const dy = y2 - y1
        const lenSq = dx * dx + dy * dy || 1
        let t = ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq
        t = Math.max(0, Math.min(1, t))
        const cx = x1 + t * dx
        const cy = y1 + t * dy
        const dist = Math.hypot(p.x - cx, p.y - cy)
        if (dist < p.size * 0.6) {
          p.sliced = true
          p.spin *= 2.5
          p.vx *= 1.4
          if (!p.counted) {
            p.counted = true
            if (p.isBomb) bombRef.current?.()
            else scoreRef.current?.()
          }
        }
      }
    }

    let lastPoint = null
    const pointerMove = (e) => {
      if (frozenRef.current) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (lastPoint) sliceAt(lastPoint.x, lastPoint.y, x, y)
      lastPoint = { x, y }
      trail.push({ x, y, life: TRAIL_LIFE })
    }
    const pointerLeave = () => {
      lastPoint = null
    }

    canvas.addEventListener('pointermove', pointerMove)
    canvas.addEventListener('pointerleave', pointerLeave)

    const frame = (now) => {
      if (!running) return
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      ctx.clearRect(0, 0, width, height)

      if (!frozenRef.current) {
        spawnIn -= dt
        if (spawnIn <= 0) {
          spawn()
          spawnIn = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN)
        }
      }

      for (let i = pieces.length - 1; i >= 0; i--) {
        const p = pieces[i]
        if (!frozenRef.current) {
          p.vy += GRAVITY * dt
          p.x += p.vx * dt
          p.y += p.vy * dt
          p.rot += p.spin * dt
          if (p.sliced) p.alpha -= dt * 1.6
        }

        if (p.alpha <= 0 || p.y - p.size > height + 40) {
          pieces.splice(i, 1)
          continue
        }

        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        if (p.isBomb) {
          drawBomb(ctx, p.size, now / 1000)
        } else if (p.img.complete && p.img.naturalWidth) {
          ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size)
        }
        ctx.restore()
      }

      // Trail drawn newest-last so the stroke tapers toward the tail.
      for (let i = trail.length - 1; i >= 0; i--) {
        trail[i].life -= dt
        if (trail[i].life <= 0) trail.splice(i, 1)
      }
      if (trail.length > 1) {
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1]
          const b = trail[i]
          const t = b.life / TRAIL_LIFE
          ctx.globalAlpha = t * 0.9
          ctx.strokeStyle = 'rgba(255, 227, 134, 1)'
          ctx.lineWidth = Math.max(1, 10 * t)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
        ctx.restore()
      }

      requestAnimationFrame(frame)
    }

    requestAnimationFrame(frame)

    return () => {
      running = false
      ro.disconnect()
      canvas.removeEventListener('pointermove', pointerMove)
      canvas.removeEventListener('pointerleave', pointerLeave)
    }
  }, [])

  return (
    <div className="absolute inset-0 z-15 pointer-events-auto">
      <div className="relative w-full h-full min-h-[360px] overflow-hidden select-none">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Interactive fruit slicing mini-game. Move pointer or touch across the screen to slice fresh flying coconuts and fruits."
          className="absolute inset-0 z-10 w-full h-full cursor-crosshair touch-none"
        >
          Interactive fruit slicing game. Slice flying tropical coconuts and fruit
          with your pointer or touch.
        </canvas>
      </div>
    </div>
  )
}

export default FooterGame

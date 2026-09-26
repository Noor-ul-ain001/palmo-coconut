import { useRef } from 'react'
import { gsap, useGSAP, SplitText, ScrollTrigger, reduced } from '../lib/gsap'
import { SEQ, onSeq } from '../lib/coconutSeq'
import FlipButton from './FlipButton'

// The stage readout is driven by a paused master timeline whose playhead is
// tweened toward a label whenever the 3D sequence announces a new phase.
// `at` is that label's time on the timeline; `p` is the progress the bar and
// the 000 counter should show once it arrives.
const STAGES = [
  { at: 0.9, p: 0, label: 'Whole coconut' },
  { at: 1.9, p: 0.34, label: 'Shaking' },
  { at: 2.8, p: 0.62, label: 'Cracked open' },
  { at: 4.2, p: 1, label: 'Canned' },
]

function SequenceAnimation() {
  const sectionRef = useRef(null)
  const headingRef = useRef(null)
  const leadRef = useRef(null)
  const bottomRef = useRef(null)
  const buttonRef = useRef(null)
  const meterRef = useRef(null)
  const barRef = useRef(null)
  const trackRef = useRef(null)
  const labelRef = useRef(null)
  const countRef = useRef(null)

  useGSAP(
    () => {
      let teardown = null
      let lastWidth = window.innerWidth
      let resizeTimer = null

      const build = () => {
        const heading = SplitText.create(headingRef.current, {
          type: 'chars',
          charsClass: 'inline-block will-change-transform',
          mask: 'chars',
        })
        const lead = SplitText.create(leadRef.current, {
          type: 'lines',
          linesClass: 'will-change-transform',
          mask: 'lines',
        })
        const bottom = SplitText.create(bottomRef.current, {
          type: 'lines',
          linesClass: 'will-change-transform',
          mask: 'lines',
        })

        const state = { p: 0 }
        let stageIndex = -1
        let labelSwap = null

        const render = (time = 0) => {
          gsap.set(barRef.current, { width: `${100 * state.p}%` })
          countRef.current.textContent = String(Math.round(100 * state.p)).padStart(3, '0')

          let next = 0
          while (next + 1 < STAGES.length && time > STAGES[next].at) next++
          if (next === stageIndex) return

          const firstRender = stageIndex === -1
          stageIndex = next
          if (firstRender) {
            labelRef.current.textContent = STAGES[next].label
            return
          }

          labelSwap?.kill()
          labelSwap = gsap
            .timeline()
            .to(labelRef.current, { autoAlpha: 0, y: -6, duration: 0.15, ease: 'power2.in' })
            .add(() => {
              labelRef.current.textContent = STAGES[stageIndex].label
            })
            .fromTo(
              labelRef.current,
              { autoAlpha: 0, y: 6 },
              { autoAlpha: 1, y: 0, duration: 0.24, ease: 'power2.out' }
            )
        }

        gsap.set([...heading.chars, ...lead.lines, ...bottom.lines], { yPercent: 115 })
        gsap.set(buttonRef.current, { autoAlpha: 0, y: 12 })
        gsap.set(meterRef.current, { autoAlpha: 0, y: 10 })
        gsap.set(trackRef.current, { scaleX: 0 })
        render()

        const master = gsap.timeline({ paused: true, onUpdate: () => render(master.time()) })

        STAGES.slice(1).forEach((stage, i) => {
          const prev = STAGES[i]
          master.to(state, { p: stage.p, duration: stage.at - prev.at, ease: 'power1.inOut' }, prev.at)
        })

        master
          .to(meterRef.current, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0)
          .to(trackRef.current, { scaleX: 1, duration: 0.9, ease: 'power3.inOut' }, 0)
          .addLabel('ready', 0.9)
          .addLabel('shaking', 1.9)

        master
          .to(
            heading.chars,
            {
              yPercent: 0,
              duration: 0.9,
              ease: 'expo.out',
              stagger: { each: 0.035, from: 'center' },
            },
            1.9
          )
          .addLabel('burst', 2.8)

        master
          .to(lead.lines, { yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 2.6)
          .to(bottom.lines, { yPercent: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 2.85)
          .to(buttonRef.current, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 3.15)
          .addLabel('done', 4.2)

        let seek = null
        const tweenTo = (target, vars) => {
          seek?.kill()
          seek = master.tweenTo(target, { ease: 'none', ...vars })
        }

        // The 3D sequence sends how much time its own tween has left, so the
        // readout lands on the same beat rather than racing ahead of it.
        const advance = (label, budget) => {
          const remaining = master.labels[label] - master.time()
          if (remaining <= 0) return
          tweenTo(label, {
            duration: Math.min(remaining, budget > 0 ? Math.max(budget - 0.15, 0.1) : Infinity),
          })
        }

        const offs = [
          onSeq(SEQ.shake, () => advance('shaking')),
          onSeq(SEQ.burst, (e) => advance('burst', e.detail?.budget)),
          onSeq(SEQ.can, (e) => advance('done', e.detail?.budget)),
          onSeq(SEQ.reset, () => {
            const t = master.time()
            if (t > 0) tweenTo(0, { duration: t / 1.2, ease: 'none' })
          }),
        ]

        const enter = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'top top',
          onEnter: () => advance('ready'),
        })
        const finish = ScrollTrigger.create({
          trigger: sectionRef.current,
          start: 'bottom bottom',
          onEnter: () => advance('done'),
          onRefresh: (self) => self.progress === 1 && advance('done'),
        })

        return () => {
          offs.forEach((off) => off())
          enter.kill()
          finish.kill()
          seek?.kill()
          labelSwap?.kill()
          master.kill()
          gsap.killTweensOf(state)
          heading.revert()
          lead.revert()
          bottom.revert()
        }
      }

      if (reduced()) {
        gsap.set([meterRef.current, buttonRef.current], { autoAlpha: 1, y: 0 })
        gsap.set(trackRef.current, { scaleX: 1 })
        return undefined
      }

      teardown = build()

      // Splits are measured against the current width, so rebuild them when
      // it actually changes (ignoring mobile URL-bar height jitter).
      const onResize = () => {
        const w = window.innerWidth
        if (w === lastWidth) return
        lastWidth = w
        clearTimeout(resizeTimer)
        resizeTimer = setTimeout(() => {
          teardown?.()
          teardown = build()
          ScrollTrigger.refresh()
        }, 150)
      }

      window.addEventListener('resize', onResize)
      window.addEventListener('orientationchange', onResize)

      return () => {
        clearTimeout(resizeTimer)
        window.removeEventListener('resize', onResize)
        window.removeEventListener('orientationchange', onResize)
        teardown?.()
      }
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      id="sequence-animation"
      className="h-[calc(100vh+20vw)] max-md:h-[calc(100dvh+20vw)] bg-background mt-[-20vw] w-full relative"
    >
      <div className="sticky top-0 h-screen max-md:h-[100dvh] w-full overflow-hidden">
        <div className="relative z-10 h-full paddx max-md:flex max-md:flex-col max-md:items-center max-md:pt-[95px] max-md:pb-[85px] max-md:justify-between max-md:text-center">
          <div className="absolute top-[7vw] left-[3vw] max-md:static max-md:flex max-md:w-full max-md:flex-col max-md:items-center">
            <h2
              ref={headingRef}
              className="text180 uppercase whitespace-nowrap max-md:text-[11vw] max-md:leading-none max-md:tracking-tight max-md:text-center"
            >
              Coconut
            </h2>
            <p
              ref={leadRef}
              className="mt-[2vw] w-[27vw] text36 font-medium max-md:mt-1.5 max-md:w-full max-md:max-w-[78vw] max-md:text-center max-md:text-[3.3vw] max-md:leading-snug max-md:opacity-85"
            >
              One green coconut, opened and pressed within a day of harvest. 100%
              raw, with 500mg of potassium.
            </p>
          </div>

          <div className="hidden max-md:block max-md:flex-1 max-md:min-h-[25dvh]" />

          <div
            ref={meterRef}
            className="absolute bottom-[3vw] left-[3vw] w-[24vw] pointer-events-none max-md:static max-md:w-full max-md:px-1"
          >
            <div className="flex items-end justify-between mb-[.6vw] font-khand font-bold uppercase leading-none max-md:mb-1.5">
              <span ref={labelRef} className="text36 max-md:text-[4.5vw]">
                Whole coconut
              </span>
              <span ref={countRef} className="tabular-nums text36 max-md:text-[4.5vw]">
                000
              </span>
            </div>
            <div
              ref={trackRef}
              className="h-[.55vw] min-h-1.5 w-full rounded-full bg-foreground/12 origin-left relative overflow-hidden max-md:h-2.5"
            >
              <span ref={barRef} className="absolute inset-y-0 left-0 w-0 rounded-full bg-foreground" />
            </div>
          </div>

          <div className="absolute bottom-[3vw] right-[3vw] w-[24vw] text-right max-md:hidden">
            <p ref={bottomRef} className="text36 font-medium">
              Six flavours, each one pressed with real fruit. Mango, lychee, guava
              and three more worth meeting.
            </p>
            <div ref={buttonRef} className="mt-[.8vw] inline-block">
              <FlipButton
                href="/flavours"
                label="Explore Flavors"
                words={['Explore', 'Flavors']}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SequenceAnimation

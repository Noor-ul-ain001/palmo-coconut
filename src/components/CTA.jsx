import { useRef, useState } from 'react'
import { AnimatedHeading, AnimatedParagraph } from './AnimatedText'
import FlipButton from './FlipButton'
import RippleButton from './RippleButton'
import Can3D from './Can3D'
import { NavArrow } from './Decor'
import { FLAVOURS } from '../data/flavours'
import { gsap, reduced } from '../lib/gsap'

const WIPE_DURATION = 1.15

// Four dots pinned to the corners of each panel.
function CornerDots() {
  return (
    <>
      <span className="absolute left-[1.5vw] top-[1.5vw] size-[1vw] max-md:size-[3vw] rounded-full bg-foreground" />
      <span className="absolute right-[1.5vw] top-[1.5vw] size-[1vw] max-md:size-[3vw] rounded-full bg-foreground" />
      <span className="absolute bottom-[1.5vw] left-[1.5vw] size-[1vw] max-md:size-[3vw] rounded-full bg-foreground" />
      <span className="absolute bottom-[1.5vw] right-[1.5vw] size-[1vw] max-md:size-[3vw] rounded-full bg-foreground" />
    </>
  )
}

function CTA() {
  const [index, setIndex] = useState(0)
  const flavour = FLAVOURS[index]

  const panelRef = useRef(null)
  const wipeRef = useRef(null)
  const indexRef = useRef(0)
  const spinRef = useRef(0)
  const hoverRef = useRef(0)
  const lockedRef = useRef(false)
  const unlockTimer = useRef(null)

  // The new colour is painted on an overlay that irises open, then committed
  // to the panel underneath — so the swap reads as a wash rather than a cut.
  const step = (dir) => {
    if (lockedRef.current) return

    const next = (indexRef.current + dir + FLAVOURS.length) % FLAVOURS.length
    indexRef.current = next
    // Accumulates rather than wrapping, so stepping the same way repeatedly
    // keeps turning the can instead of snapping back.
    spinRef.current += dir
    setIndex(next)

    const panel = panelRef.current
    const wipe = wipeRef.current
    if (!panel || !wipe) return

    if (reduced()) {
      gsap.set(panel, { backgroundColor: FLAVOURS[next].color })
      gsap.set(wipe, { clipPath: 'circle(0% at 50% 50%)' })
      return
    }

    gsap.killTweensOf(wipe)
    // A wipe interrupted mid-flight still owes its colour to the panel.
    const pending = wipe.dataset.pending
    if (pending) gsap.set(panel, { backgroundColor: pending })
    wipe.dataset.pending = FLAVOURS[next].color

    gsap.set(wipe, {
      backgroundColor: FLAVOURS[next].color,
      clipPath: 'circle(0% at 50% 50%)',
    })
    gsap.to(wipe, {
      clipPath: 'circle(75% at 50% 50%)',
      duration: WIPE_DURATION,
      ease: 'expo.out',
      onComplete: () => {
        gsap.set(panel, { backgroundColor: FLAVOURS[next].color })
        gsap.set(wipe, { clipPath: 'circle(0% at 50% 50%)' })
        delete wipe.dataset.pending
      },
    })

    lockedRef.current = true
    clearTimeout(unlockTimer.current)
    unlockTimer.current = setTimeout(() => {
      lockedRef.current = false
    }, WIPE_DURATION * 1000)
  }

  return (
    <section
      id="cta"
      className="min-h-screen max-md:h-auto shrink-0 relative w-full z-10 bg-background paddx py-[4vw] pb-[8vw] max-md:pt-[8vw] max-md:pb-[20vw] flex items-center"
    >
      <div className="relative z-20 h-full min-h-[70vh] max-md:h-auto w-full flex max-md:flex-col-reverse gap-[1.5vw] max-md:gap-[5vw]">
        <div className="relative w-1/2 max-md:w-full min-h-[70vh] max-md:min-h-0 max-md:h-[110vw] overflow-hidden rounded-[2vw] max-md:rounded-[6vw] border-4 border-foreground/60 bg-beige px-[4vw] py-[3vw] max-md:px-[7vw] max-md:py-[8vw] flex flex-col justify-center max-md:items-center max-md:text-center">
          <CornerDots />

          <AnimatedParagraph className="font-patrick-hand text32 uppercase opacity-70">
            straight from the shell
          </AnimatedParagraph>
          <AnimatedHeading className="text180 mt-[min(1.5vw,2vh)] max-md:mt-[4vw] uppercase">
            THE BOX OF HEALTH.
          </AnimatedHeading>
          <AnimatedParagraph
            delay={0.15}
            className="text36 mt-[min(2vw,2.5vh)] max-md:mt-[5vw] w-[85%] max-md:w-full font-medium"
          >
            Chilled, clean, ready to sip. Order before the batch runs dry.
          </AnimatedParagraph>

          <div className="mt-[min(3vw,3.5vh)] max-md:mt-[8vw] flex items-center gap-[2vw] max-md:gap-[2vw]">
            <FlipButton
              href="/flavours"
              label="Get Your Drink"
              words={['Get', 'Your', 'Drink']}
            />
            <FlipButton
              href="/flavours"
              label="Explore Flavors"
              words={['Explore', 'Flavors']}
            />
          </div>
        </div>

        <div
          ref={panelRef}
          style={{ backgroundColor: FLAVOURS[0].color }}
          className="relative w-1/2 max-md:w-full min-h-[70vh] max-md:min-h-0 max-md:h-[110vw] overflow-hidden rounded-[2vw] max-md:rounded-[6vw] border-4 border-foreground/60 flex flex-col"
        >
          <span
            ref={wipeRef}
            aria-hidden="true"
            style={{ clipPath: 'circle(0% at 50% 50%)' }}
            className="pointer-events-none absolute inset-0 will-change-[clip-path]"
          />
          <CornerDots />

          <p
            style={{ color: flavour.bgColor }}
            className="relative z-10 pt-[3vw] max-md:pt-[8vw] text-center font-patrick-hand text32 uppercase transition-colors duration-700"
          >
            {flavour.fullName}
          </p>

          <div
            onPointerEnter={() => {
              hoverRef.current = 1
            }}
            onPointerLeave={() => {
              hoverRef.current = 0
            }}
            className="relative flex-1 min-h-[42vh] max-md:min-h-0 w-full"
          >
            <Can3D
              texture={flavour.texture}
              spinRef={spinRef}
              hoverRef={hoverRef}
              autoSpin={false}
              className="absolute inset-0 h-full w-full"
            />

            <RippleButton
              aria-label="Previous flavour"
              onClick={() => step(-1)}
              className="absolute! left-[2vw] max-md:left-[5vw] top-1/2 -translate-y-1/2 z-20 size-[5vw] max-md:size-12 bg-foreground border-2 border-foreground text-background hover:text-foreground"
            >
              <div className="h-[1.2vw] w-[1.4vw] max-md:h-3.5 max-md:w-4 transition-colors duration-500">
                <NavArrow />
              </div>
            </RippleButton>

            <RippleButton
              aria-label="Next flavour"
              onClick={() => step(1)}
              className="absolute! right-[2vw] max-md:right-[5vw] top-1/2 -translate-y-1/2 z-20 size-[5vw] max-md:size-12 bg-foreground border-2 border-foreground text-background hover:text-foreground"
            >
              <div className="h-[1.2vw] w-[1.4vw] max-md:h-3.5 max-md:w-4 rotate-180 transition-colors duration-500">
                <NavArrow />
              </div>
            </RippleButton>
          </div>
        </div>
      </div>

      {/* Scalloped edge that the footer rises behind. */}
      <div className="absolute translate-y-[7.5vw] bottom-0 left-0 w-full h-fit pointer-events-none z-10">
        <div className="h-fit w-full overflow-hidden flex items-center justify-center relative z-9">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="size-[calc(100vw/5.5)] rounded-full bg-background shrink-0"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default CTA

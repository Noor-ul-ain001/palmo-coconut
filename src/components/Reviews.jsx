import { useRef } from 'react'
import { gsap, useGSAP, Draggable, reduced } from '../lib/gsap'
import { AnimatedHeading } from './AnimatedText'
import RippleButton from './RippleButton'
import { NavArrow, QuoteMark, HealthSwirl } from './Decor'

const REVIEWS = [
  { quote: 'I just love the product.', handle: '@Theheartbrosco' },
  { quote: 'Tastes like a holiday.', handle: '@coconutclub' },
  { quote: 'My morning ritual now.', handle: '@sipwithsana' },
  { quote: 'Clean, crisp, unreal.', handle: '@ravi.eats' },
  { quote: 'Nothing else comes close.', handle: '@thegreenpantry' },
  { quote: 'Finished the box in a week.', handle: '@dailydoseofmeher' },
]

// Tripled so the wrap point is never visible at either edge.
const TRACK = [...REVIEWS, ...REVIEWS, ...REVIEWS]

function Reviews() {
  const sectionRef = useRef(null)
  const rowRef = useRef(null)
  const nudgeRef = useRef(null)

  useGSAP(
    () => {
      const section = sectionRef.current
      const row = rowRef.current
      if (!section || !row) return undefined

      const cards = gsap.utils.toArray('[data-card]', row)
      const isReduced = reduced()

      gsap.set(cards, { transformOrigin: 'left top' })

      // Dragging moves an off-screen proxy rather than the row itself, so the
      // row's x can be wrapped into range on every frame without fighting
      // Draggable's own bookkeeping.
      const proxy = document.createElement('div')
      gsap.set(proxy, { x: 0 })

      let loopWidth = 0
      let step = 0
      let wrap = gsap.utils.wrap(0, 1)

      const render = () => {
        gsap.set(row, { x: wrap(gsap.getProperty(proxy, 'x')) })
      }

      const measure = () => {
        const gap = parseFloat(getComputedStyle(row).columnGap) || 0
        loopWidth = (row.scrollWidth + gap) / 3
        step = loopWidth / REVIEWS.length
        wrap = gsap.utils.wrap(-loopWidth, 0)
        render()
      }

      measure()

      const draggable = Draggable.create(proxy, {
        type: 'x',
        trigger: section,
        inertia: true,
        allowNativeTouchScrolling: true,
        cursor: 'grab',
        activeCursor: 'grabbing',
        onPress() {
          gsap.killTweensOf(proxy)
          this.update()
        },
        onDrag: render,
        onThrowUpdate: render,
      })[0]

      nudgeRef.current = (dir) => {
        gsap.killTweensOf(proxy)
        gsap.to(proxy, {
          x: gsap.getProperty(proxy, 'x') - dir * step,
          duration: 0.9,
          ease: 'power3.out',
          onUpdate: render,
        })
      }

      // Cards tilt against the drag direction and ease back, each with a
      // slightly different response so the row does not move as one slab.
      const setRotation = cards.map((card) => gsap.quickSetter(card, 'rotation', 'deg'))
      const current = cards.map(() => 0)
      const responsiveness = cards.map((_, i) => 0.09 + (i % 3) * 0.02)
      let lastX = 0

      const tick = () => {
        const x = gsap.getProperty(proxy, 'x')
        const dx = x - lastX
        lastX = x
        const target = gsap.utils.clamp(-10, 10, -(0.22 * dx))
        const ratio = gsap.ticker.deltaRatio()
        for (let i = 0; i < current.length; i++) {
          current[i] += (target - current[i]) * Math.min(1, responsiveness[i] * ratio)
          setRotation[i](current[i])
        }
      }

      if (!isReduced) gsap.ticker.add(tick)

      const ro = new ResizeObserver(measure)
      ro.observe(section)

      return () => {
        gsap.ticker.remove(tick)
        ro.disconnect()
        draggable.kill()
        nudgeRef.current = null
      }
    },
    { scope: sectionRef, dependencies: [] }
  )

  return (
    <section
      ref={sectionRef}
      id="reviews"
      className="h-fit relative w-full bg-background z-10 overflow-x-clip pt-[2vw] pb-[8vw] max-md:pt-[6vh] max-md:pb-[10vh]"
    >
      <div className="paddx relative z-10 flex w-full items-center max-md:justify-center justify-between max-md:gap-4">
        <AnimatedHeading as="h2" className="text180 uppercase">
          Sippers Say !
        </AnimatedHeading>

        <div className="flex items-center max-md:hidden gap-[1vw] max-md:gap-3 max-md:shrink-0">
          <RippleButton
            aria-label="Previous review"
            onClick={() => nudgeRef.current?.(-1)}
            className="size-[5vw] max-md:size-12 bg-foreground border-2 border-foreground text-background hover:text-foreground"
          >
            <div className="h-[1.2vw] w-[1.4vw] max-md:h-3.5 max-md:w-4 transition-colors duration-500">
              <NavArrow />
            </div>
          </RippleButton>
          <RippleButton
            aria-label="Next review"
            onClick={() => nudgeRef.current?.(1)}
            className="size-[5vw] max-md:size-12 bg-foreground border-2 border-foreground text-background hover:text-foreground"
          >
            <div className="h-[1.2vw] w-[1.4vw] max-md:h-3.5 max-md:w-4 rotate-180 transition-colors duration-500">
              <NavArrow />
            </div>
          </RippleButton>
        </div>
      </div>

      <div className="mt-[2vw] max-md:z-22 max-md:mt-0! relative z-22 w-full touch-pan-y py-[5vw] pl-[3vw] max-md:py-[6vh] max-md:pl-[5vw]">
        <div ref={rowRef} className="flex w-max gap-[1.6vw] max-md:gap-4 will-change-transform">
          {TRACK.map((review, i) => (
            <article
              key={`${review.handle}-${i}`}
              data-card="true"
              className="relative z-10 flex h-[23vw] w-[27vw] shrink-0 select-none flex-col items-center justify-center rounded-[1.8vw] border-4 border-foreground/60 bg-background px-[2.5vw] text-center max-md:h-[42vw] max-md:w-[62vw] max-md:rounded-3xl max-md:px-6"
            >
              <span className="absolute left-[1.5vw] top-[1.5vw] size-[1.3vw] rounded-full bg-foreground max-md:left-4 max-md:top-4 max-md:size-2.5" />
              <span className="absolute right-[1.5vw] top-[1.5vw] size-[1.3vw] rounded-full bg-foreground max-md:right-4 max-md:top-4 max-md:size-2.5" />
              <div className="mb-[2vw] h-[3.5vw] w-[4.2vw] text-gold max-md:mb-4 max-md:h-7 max-md:w-8">
                <QuoteMark />
              </div>
              <h3 className="font-khand text52 font-semibold uppercase leading-[95%] tracking-[-0.02em]">
                {review.quote}
              </h3>
              <p className="mt-[1.4vw] max-md:mt-3 font-patrick-hand text36 leading-none">
                {review.handle}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="absolute right-[5vw] text-light-beige rotate-10 z-20 bottom-[8vw] size-[25vw] max-md:size-[45vw] max-md:right-[-12vw] max-md:bottom-[-4vw]">
        <div>
          <HealthSwirl />
        </div>
      </div>
    </section>
  )
}

export default Reviews

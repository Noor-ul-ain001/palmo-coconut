import { useRef } from 'react'
import { gsap, useGSAP, reduced } from '../lib/gsap'
import { AnimatedHeading, AnimatedParagraph } from './AnimatedText'
import HeadingWaves from './HeadingWaves'

const STATS = [
  { value: '500', unit: 'MG', label: 'Of Potassium', variant: 'light' },
  { value: '100%', unit: '', label: 'Natural Hydration', variant: 'dark' },
  { value: '0', unit: 'GM', label: 'Of Sugar', variant: 'dark' },
  { value: '45', unit: 'KCL', label: 'Per 200Ml', variant: 'light' },
]

// Lateral swing of each badge as a fraction of the viewport width, and how
// far it rotates at the peak of that swing. Index-matched to STATS.
const AMPLITUDES = [0.25, 0.3, 0.27, 0.38]
const SPINS = [-45, 40, -50, 48]

function StatBadge({ value, unit, label, variant }) {
  const dark = variant === 'dark'
  return (
    <div
      className={`rounded-full border-4 ${dark ? 'border-beige' : 'border-foreground'} ${
        dark ? 'bg-light-brown' : 'bg-beige'
      } ${
        dark ? 'text-beige' : 'text-foreground'
      } aspect-square flex flex-col size-[15vw] max-md:size-[30vw] max-md:border-2 items-center justify-center text-center p-[1vw] max-md:p-2 select-none curved-scroll-box absolute`}
    >
      <div className="flex font-semibold items-baseline justify-center leading-none font-khand tracking-tighter">
        <span className="text-[4.2vw] max-md:text-[9vw]">{value}</span>
        {unit && <span className="text-[2.3rem] max-md:text-[4.5vw] uppercase">{unit}</span>}
      </div>
      {label && (
        <p className="text36 max-md:text-[3.2vw] font-inter font-medium leading-tight mt-[-.5vw] max-md:mt-0">
          {label}
        </p>
      )}
    </div>
  )
}

function Benefits() {
  const sectionRef = useRef(null)
  const stageRef = useRef(null)

  useGSAP(
    () => {
      const boxes = gsap.utils.toArray('.curved-scroll-box')
      if (!boxes.length) return

      const isReduced = reduced()

      // Each badge rises the full height of the pinned stage while its x is
      // driven off a half-sine — so it arcs out and back rather than
      // travelling in a straight line. Staggering the start by 0.3 keeps
      // them from overlapping on the same part of the curve.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: true,
        },
      })

      const amplitudeFor = (el, i) => {
        const fraction = AMPLITUDES[i % AMPLITUDES.length] || 0.25
        if (!window.matchMedia('(max-width: 1024px)').matches) {
          return window.innerWidth * fraction
        }
        // On narrow screens the swing is clamped so a badge can never leave
        // the stage box.
        const stageWidth = stageRef.current?.offsetWidth || window.innerWidth
        const max = Math.max(0, stageWidth / 2 - el.offsetWidth / 2 - 0.02 * stageWidth)
        return Math.min(stageWidth * fraction, max)
      }

      boxes.forEach((el, i) => {
        const toLeft = i % 2 === 0
        const at = 0.3 * i
        const spin = SPINS[i % SPINS.length] || 15

        if (isReduced) {
          tl.fromTo(
            el,
            { y: '50vh', x: 0, rotate: 0 },
            { y: '-50vh', ease: 'none', duration: 1 },
            at
          )
          return
        }

        tl.fromTo(
          el,
          { y: '70vh', x: 0, rotate: 0 },
          {
            y: '-70vh',
            ease: 'none',
            duration: 1,
            onUpdate: function onUpdate() {
              const phase = this.progress() * Math.PI
              const swing = Math.sin(phase) * amplitudeFor(el, i)
              gsap.set(el, {
                x: toLeft ? -swing : swing,
                rotate: Math.sin(phase) * spin,
              })
            },
          },
          at
        )
      })
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      id="benefits"
      className="h-[320vh] bg-background relative paddx w-full"
    >
      <h2 className="text180 pt-[6vw] max-md:pt-[18vh] uppercase w-full leading-[85%] relative">
        <span className="grid w-full grid-cols-[1fr_auto_1fr] items-center max-md:flex max-md:flex-col max-md:items-center max-md:w-full">
          <AnimatedHeading
            as="span"
            className="whitespace-nowrap text-left max-md:block max-md:w-full max-md:text-center"
          >
            The real
          </AnimatedHeading>
          <HeadingWaves className="heading-waves w-[28vw] p-[1vw] translate-y-[-1.5vw] translate-x-[-1.5vw] text-beige max-md:hidden" />
          <AnimatedHeading
            as="span"
            className="whitespace-nowrap text-right max-md:block max-md:w-full max-md:text-center"
          >
            Source of
          </AnimatedHeading>
        </span>
        <span className="block text-right mr-[14vw] mt-[-3.5vw] whitespace-nowrap max-md:text-center max-md:mr-0 max-md:mt-0 max-md:w-full">
          <AnimatedHeading as="span" className="inline-block max-md:block max-md:w-full">
            every Sip.
          </AnimatedHeading>
        </span>
      </h2>

      <AnimatedParagraph className="text36 max-md:text-center font-medium font-sans capitalize w-[25vw] absolute left-[3.5vw] top-[24vw] max-md:static max-md:w-[85%] max-md:mx-auto max-md:mt-6">
        For centuries, coconuts have carried their own perfectly balanced source
        of refreshment.
      </AnimatedParagraph>

      <div
        ref={stageRef}
        className="h-screen w-full sticky mt-[10vw] max-md:mt-[12vh] py-[6vw] top-0 flex items-center justify-center pointer-events-none overflow-hidden"
      >
        {STATS.map((stat) => (
          <StatBadge key={stat.label} {...stat} />
        ))}
      </div>
    </section>
  )
}

export default Benefits

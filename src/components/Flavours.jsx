import { useRef } from 'react'
import { FLAVOURS } from '../data/flavours'
import FlavourCard from './FlavourCard'
import { AnimatedHeading } from './AnimatedText'
import { Chakra } from './Decor'
import { gsap, useGSAP, reduced } from '../lib/gsap'

const FEATURED = FLAVOURS.slice(0, 3)

function Flavours() {
  const sectionRef = useRef(null)
  const iconRef = useRef(null)

  // The mark between the two words turns one full revolution across the
  // whole section, tying the scroll to the heading.
  useGSAP(
    () => {
      if (reduced() || !iconRef.current) return
      gsap.to(iconRef.current, {
        rotation: 360,
        ease: 'none',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
    },
    { scope: sectionRef }
  )

  return (
    <section
      ref={sectionRef}
      id="flavours"
      data-nav-dark="0 7"
      className="h-fit z-10 mt-[-2vw] max-md:mt-[-14vw] pb-[7vw] text-background relative w-full bg-foreground"
    >
      <div className="paddx flex gap-[4vw] max-md:gap-[8vw] flex-col items-center justify-between h-full py-[10vw]">
        <h2 className="text180 max-md:hidden flex items-center justify-between text-center w-full uppercase">
          <AnimatedHeading as="span">Explore all</AnimatedHeading>
          <span ref={iconRef} className="size-[8vw] inline-block will-change-transform">
            <div className="size-full max-md:hidden">
              <Chakra />
            </div>
          </span>
          <AnimatedHeading as="span" from="end">
            flavours
          </AnimatedHeading>
        </h2>

        <h2 className="text180 hidden max-md:text-center w-full max-md:block uppercase">
          Explore <br /> all flavours
        </h2>

        <div className="flex max-md:flex-col items-center max-md:gap-[4vw] gap-[1vw] w-full justify-between">
          {FEATURED.map((flavour) => (
            <FlavourCard key={flavour.id} flavour={flavour} />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Flavours

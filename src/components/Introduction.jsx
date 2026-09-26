import SlotWords from './SlotWords'
import { IntroFlower, IntroLeaf, IntroCoconutPiece, IntroArrow } from './Decor'

const WORDS = [
  { text: 'pure', className: 'bg-beige text-foreground' },
  { text: 'Fresh', className: 'bg-gold text-background' },
  { text: 'Clean', className: 'bg-light-beige text-light-brown' },
]

function Introduction() {
  return (
    <section id="introduction" className="relative overflow-x-hidden w-full z-10 mt-[-10vw]">
      {/* Scalloped seam: a row of circles the dark panel then overlaps. */}
      <div className="h-fit w-full overflow-hidden flex items-center justify-center relative z-9">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="size-[calc(100vw/5.5)] rounded-full bg-foreground shrink-0"
          />
        ))}
      </div>

      <div
        data-nav-dark="true"
        className="text-background bg-foreground paddx h-[calc(100vh+10vw)] flex items-center justify-center relative z-10 mt-[-10vw] w-full"
      >
        <div className="relative z-10">
          <h2 className="text150 text-center w-[85vw] uppercase">
            Pure coconut water. Naturally hydrating, refreshingly{' '}
            <SlotWords words={WORDS} />, from nature&apos;s source.
          </h2>
        </div>

        <div className="absolute z-0 pointer-events-none max-md:size-[30vw] size-[10vw] top-[10vw] max-md:top-[40vw] left-[5vw]">
          <div className="size-full">
            <IntroFlower />
          </div>
        </div>

        <div className="absolute z-0 pointer-events-none max-md:size-[35vw] text-light-beige size-[16vw] max-md:bottom-[60vw] max-md:left-[15vw] bottom-[10vw] left-[5vw]">
          <div className="size-full">
            <IntroLeaf />
          </div>
        </div>

        <div className="absolute z-0 pointer-events-none max-md:size-[35vw] size-[15vw] top-[9vw] max-md:top-[30vw] right-[4vw]">
          <div className="size-full">
            <IntroCoconutPiece />
          </div>
        </div>

        <div className="absolute max-md:hidden max-md:size-[35vw] bottom-[13.5vw] text-beige right-[16vw]">
          <div>
            <div className="size-[6vw] scale-x-[-1] -rotate-5">
              <IntroArrow />
            </div>
          </div>
          <p className="text32 w-[9vw] -rotate-10 translate-x-[1.5vw] font-medium mt-[.5vw] text-center capitalize font-patrick-hand">
            thats why people love to drink it !
          </p>
        </div>
      </div>
    </section>
  )
}

export default Introduction

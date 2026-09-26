import { useLayoutEffect, useRef } from 'react'
import { gsap, reduced } from '../lib/gsap'
import { AnimatedHeading, AnimatedParagraph } from './AnimatedText'
import FlipButton from './FlipButton'
import { HealthSwirl } from './Decor'

const PHOTOS = [
  {
    src: '/img/coconut-holding.webp',
    alt: 'Fresh harvested coconut held in hand',
    rotation: 13,
    position: 'right-[-8vw] top-0',
  },
  {
    src: '/img/bunch-of-coconut.webp',
    alt: 'Organic fresh coconuts bunched on palm grove floor',
    rotation: 0,
    position: 'right-[8vw] z-2 bottom-[4vw]',
  },
  {
    src: '/img/good-coconut.webp',
    alt: 'Clean ripe coconut showing natural golden husk texture',
    rotation: -9,
    position: 'right-[30vw] z-3 top-[4vw]',
  },
]

function HealthBenefits() {
  const sectionRef = useRef(null)

  // Each photo tracks pointer velocity while hovered and is flung on the way
  // out, settling back to its resting tilt. Inertia is what makes them feel
  // like loose prints on a table rather than fixed panels.
  useLayoutEffect(() => {
    if (!sectionRef.current || reduced()) return undefined

    const items = sectionRef.current.querySelectorAll('.media-item')
    const cleanups = []

    items.forEach((el) => {
      let lastX = 0
      let lastY = 0
      let dx = 0
      let dy = 0
      const rest = parseFloat(el.dataset.rotation) || 0

      gsap.set(el, { rotation: rest, x: 0, y: 0 })

      const onMove = (e) => {
        dx = e.clientX - lastX
        dy = e.clientY - lastY
        lastX = e.clientX
        lastY = e.clientY
      }
      const onEnter = (e) => {
        gsap.killTweensOf(el)
        dx = 0
        dy = 0
        lastX = e.clientX
        lastY = e.clientY
      }
      const onLeave = () => {
        gsap.to(el, {
          inertia: {
            x: { velocity: 30 * dx, end: 0 },
            y: { velocity: 30 * dy, end: 0 },
            rotation: { velocity: 2 * dx, end: rest },
            resistance: 150,
          },
          force3D: true,
        })
      }

      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', onLeave)

      cleanups.push(() => {
        gsap.killTweensOf(el)
        el.removeEventListener('mousemove', onMove)
        el.removeEventListener('mouseenter', onEnter)
        el.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return (
    <section
      ref={sectionRef}
      id="health-benifts"
      className="h-fit relative z-1 bg-background overflow-x-clip paddx max-md:px-0! pt-[20vw] py-[10vw] w-full"
    >
      <AnimatedHeading
        as="h2"
        className="text180 px-[10vw] max-md:w-full max-md:px-0! uppercase text-center"
      >
        you deserve the best for your health.
      </AnimatedHeading>

      <div className="flex h-screen items-start max-md:flex-col-reverse max-md:h-auto max-md:gap-[8vw] max-md:overflow-x-hidden! max-md:z-20! relative justify-between">
        <div className="relative z-10 flex flex-col w-[38vw] items-start max-md:items-center max-md:w-full max-md:mx-auto space-y-[2vw] pt-[10vw] max-md:pt-0 max-md:space-y-6">
          <AnimatedParagraph className="text36 max-md:text-center max-md:w-[90%] font-medium">
            We want to make healthy, science-backed nutrition simple and
            accessible so you can feel better, perform better, and enjoy life
            every single day.
          </AnimatedParagraph>
          <FlipButton
            href="/flavours"
            label="Get Your Drink"
            words={['Get', 'Your', 'Drink']}
          />
        </div>

        <div className="w-full max-md:mt-[10vw] h-full relative max-md:flex max-md:h-[58vw] max-md:overflow-x-clip max-md:flex-row-reverse max-md:items-center max-md:justify-center">
          {PHOTOS.map((photo) => (
            <div
              key={photo.alt}
              data-rotation={photo.rotation}
              className={`media-item h-[42vw] p-[1vw] w-[30vw] absolute ${photo.position} bg-light-beige max-md:relative max-md:right-auto max-md:top-auto max-md:bottom-auto max-md:mx-[-5vw] max-md:h-[52vw] max-md:w-[38vw] max-md:p-[2vw]`}
            >
              <div className="h-full w-full relative bg-foreground">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute max-md:size-[35vw] rotate-80 text-light-beige bottom-[10vw] left-[5vw] z-0 size-[20vw]">
          <div className="size-full">
            <HealthSwirl />
          </div>
        </div>
      </div>
    </section>
  )
}

export default HealthBenefits

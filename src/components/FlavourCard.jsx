import { useEffect, useRef, useState } from 'react'
import Can3D from './Can3D'
import { HealthSwirl, IntroLeaf, PlusIcon } from './Decor'
import { PACKS, packPrice } from '../data/flavours'
import { useBasket } from '../context/BasketContext'
import { gsap, reduced } from '../lib/gsap'

// Resting offsets for the four corner marks, as a percentage of each mark's
// own size — they are large (8–12vw) so a percentage throw carries them
// well clear of the card before the overflow clips them.
const DECOR = [
  { x: -160, y: 160, spin: -45 },
  { x: 160, y: -160, spin: 60 },
  { x: 160, y: 160, spin: 90 },
  { x: -160, y: -160, spin: -70 },
]

// Two stacked copies per character: the lower one sits at `top-full` in the
// brand's mid-brown, so rolling the column up a full height swaps the colour
// as well as the glyph.
function FlipName({ name }) {
  return (
    <span className="flex">
      {name.split('').map((char, i) => (
        <span key={i} className="relative inline-block overflow-hidden">
          <span data-char="true" className="block will-change-transform">
            <span className="block whitespace-pre">{char}</span>
            <span className="block whitespace-pre absolute top-full left-0 text-light-brown">
              {char}
            </span>
          </span>
        </span>
      ))}
    </span>
  )
}

function FlavourCard({ flavour }) {
  const { addItem, open: openBasket } = useBasket()
  const [packsOpen, setPacksOpen] = useState(false)
  const [added, setAdded] = useState(false)

  const cardRef = useRef(null)
  const wipeRef = useRef(null)
  const decorRef = useRef(null)
  const panelRef = useRef(null)
  const hoverRef = useRef(0)

  useEffect(() => {
    const card = cardRef.current
    const wipe = wipeRef.current
    if (!card) return undefined

    const decor = gsap.utils.toArray(decorRef.current?.children || [])
    const chars = gsap.utils.toArray('[data-char]', card)
    const isReduced = reduced()

    const rest = {
      xPercent: (i) => DECOR[i].x,
      yPercent: (i) => DECOR[i].y,
      rotation: (i) => DECOR[i].spin,
    }
    gsap.set(decor, rest)

    const enter = () => {
      hoverRef.current = 1
      if (isReduced) return
      gsap.killTweensOf([wipe, ...chars, ...decor])
      gsap.fromTo(
        wipe,
        { clipPath: 'circle(0% at 50% 50%)' },
        { clipPath: 'circle(75% at 50% 50%)', duration: 0.5, ease: 'power2.inOut' }
      )
      gsap.to(chars, {
        yPercent: -100,
        duration: 0.5,
        ease: 'power3.out',
        stagger: { each: 0.018, from: 'start' },
      })
      gsap.to(decor, {
        xPercent: 0,
        yPercent: 0,
        rotation: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.06,
        delay: 0.08,
      })
    }

    const leave = () => {
      hoverRef.current = 0
      if (isReduced) return
      gsap.killTweensOf([wipe, ...chars, ...decor])
      gsap.to(wipe, {
        clipPath: 'circle(0% at 50% 50%)',
        duration: 0.9,
        ease: 'power2.inOut',
      })
      gsap.to(chars, {
        yPercent: 0,
        duration: 0.45,
        ease: 'power3.out',
        stagger: { each: 0.015, from: 'end' },
      })
      gsap.to(decor, {
        ...rest,
        duration: 0.7,
        ease: 'power2.in',
        stagger: { each: 0.05, from: 'end' },
      })
    }

    card.addEventListener('pointerenter', enter)
    card.addEventListener('pointerleave', leave)
    return () => {
      card.removeEventListener('pointerenter', enter)
      card.removeEventListener('pointerleave', leave)
      gsap.killTweensOf([wipe, ...chars, ...decor])
    }
  }, [])

  // Pack picker grows out of the add button's bottom-right corner.
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    if (reduced()) {
      gsap.set(panel, { autoAlpha: packsOpen ? 1 : 0 })
      return
    }
    gsap.killTweensOf(panel)
    if (packsOpen) {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, scale: 0.85, y: 8 },
        { autoAlpha: 1, scale: 1, y: 0, duration: 0.4, ease: 'back.out(1.6)' }
      )
    } else {
      gsap.to(panel, { autoAlpha: 0, scale: 0.9, y: 6, duration: 0.22, ease: 'power2.in' })
    }
  }, [packsOpen])

  // Clicking anywhere else dismisses the picker.
  useEffect(() => {
    if (!packsOpen) return undefined
    const onDown = (e) => {
      if (!cardRef.current?.contains(e.target)) setPacksOpen(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [packsOpen])

  const handleAdd = (pack) => {
    addItem({
      flavourId: flavour.id,
      packId: pack.id,
      name: flavour.name,
      packLabel: pack.label,
      color: flavour.color,
      price: Number(packPrice(pack)),
    })
    setPacksOpen(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div
      ref={cardRef}
      style={{ '--flavour': flavour.color }}
      className="group h-[40vw] max-md:h-[80vw] p-[.7vw] max-md:p-[2.5vw] w-full bg-background max-md:rounded-2xl cursor-pointer"
    >
      <div className="relative w-full h-[90%] max-md:h-[85%] flex items-center justify-center bg-light-beige rounded-lg max-md:rounded-xl overflow-hidden">
        <span
          ref={wipeRef}
          aria-hidden="true"
          style={{ clipPath: 'circle(0% at 50% 50%)' }}
          className="pointer-events-none absolute inset-0 bg-(--flavour) will-change-[clip-path]"
        />

        <div
          ref={decorRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-light-beige"
        >
          <span className="absolute left-[-2vw] bottom-[-3vw] size-[12vw] max-md:size-[26vw] will-change-transform">
            <div className="size-full rotate-25">
              <HealthSwirl />
            </div>
          </span>
          <span className="absolute right-[-2vw] top-[-3vw] size-[11vw] max-md:size-[24vw] will-change-transform">
            <div className="size-full -rotate-40">
              <HealthSwirl />
            </div>
          </span>
          <span className="absolute right-[1.5vw] bottom-[1.5vw] size-[8vw] max-md:size-[18vw] will-change-transform">
            <div className="size-full rotate-12">
              <IntroLeaf />
            </div>
          </span>
          <span className="absolute left-[-1.5vw] top-[1vw] size-[8vw] max-md:size-[18vw] will-change-transform">
            <div className="size-full rotate-15">
              <IntroLeaf />
            </div>
          </span>
        </div>

        <div className="absolute inset-0 h-full w-full">
          <Can3D
            texture={flavour.texture}
            hoverRef={hoverRef}
            className="absolute inset-0 h-full w-full touch-pan-y"
          />
        </div>
      </div>

      <div className="flex h-[10%] max-md:h-[15%] max-md:pt-[2vw] px-[.5vw] w-full justify-between items-center">
        <p className="text36 font-patrick-hand text-foreground overflow-hidden">
          <FlipName name={flavour.name} />
        </p>

        <div className="relative text-foreground">
          <button
            type="button"
            aria-expanded={packsOpen}
            aria-label={`Add ${flavour.name} to basket`}
            onClick={() => setPacksOpen((o) => !o)}
            className="group/add flex cursor-pointer items-center justify-center"
          >
            <div className="size-[2vw] max-md:size-[6vw] shrink-0 transition-transform duration-500 group-hover/add:rotate-90 group-hover/add:scale-110">
              <PlusIcon />
            </div>
          </button>

          <span
            style={{ fontSize: 'min(0.9rem, 2vh)' }}
            className={`pointer-events-none absolute bottom-[calc(100%+0.6vw)] right-0 whitespace-nowrap rounded-md bg-beige px-[0.6vw] py-[0.2vw] max-md:px-3 max-md:py-1 font-patrick-hand text-foreground transition-all duration-300 ${
              added ? 'translate-y-0 opacity-100' : 'translate-y-[0.4vw] opacity-0'
            }`}
          >
            Added to basket
          </span>

          <div
            ref={panelRef}
            style={{ visibility: 'hidden' }}
            className="absolute bottom-[calc(100%+0.8vw)] max-md:bottom-[calc(100%+3vw)] right-0 z-50 w-[14vw] max-md:w-[62vw] origin-bottom-right overflow-hidden rounded-lg bg-foreground p-[0.6vw] max-md:p-3 text-light-beige shadow-lg"
          >
            <p
              style={{ fontSize: 'min(0.85rem, 1.9vh)' }}
              className="px-[0.4vw] max-md:px-2 pb-[0.4vw] max-md:pb-2 font-patrick-hand text-beige"
            >
              Pick a pack
            </p>

            {PACKS.map((pack) => (
              <button
                key={pack.id}
                data-pack="true"
                type="button"
                tabIndex={packsOpen ? 0 : -1}
                onClick={() => handleAdd(pack)}
                className="group/pack flex w-full cursor-pointer items-center justify-between gap-[0.5vw] max-md:gap-2 rounded-md px-[0.4vw] py-[0.35vw] max-md:px-2 max-md:py-2 text-left transition-colors duration-300 hover:bg-light-beige hover:text-foreground"
              >
                <span className="min-w-0">
                  <span
                    className="block font-patrick-hand"
                    style={{ fontSize: 'min(1rem, 2.2vh)' }}
                  >
                    {pack.label}
                  </span>
                  <span
                    className="block truncate font-patrick-hand opacity-50"
                    style={{ fontSize: 'min(0.75rem, 1.7vh)' }}
                  >
                    {pack.note}
                  </span>
                </span>
                <span
                  className="shrink-0 font-patrick-hand tabular-nums text-beige transition-colors duration-300 group-hover/pack:text-foreground"
                  style={{ fontSize: 'min(0.95rem, 2.1vh)' }}
                >
                  ${packPrice(pack)}
                </span>
              </button>
            ))}

            <button
              type="button"
              tabIndex={packsOpen ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation()
                setPacksOpen(false)
                openBasket()
              }}
              style={{ fontSize: 'min(0.75rem, 1.7vh)' }}
              className="mt-[0.3vw] max-md:mt-1 w-full cursor-pointer border-t border-light-beige/15 pt-[0.4vw] max-md:pt-2 font-patrick-hand text-light-beige/50 transition-colors duration-300 hover:text-beige"
            >
              View basket
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FlavourCard

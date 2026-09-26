import { useEffect, useLayoutEffect, useRef } from 'react'
import { useBasket, MAX_QTY, FREE_SHIPPING_AT } from '../context/BasketContext'
import { gsap, reduced } from '../lib/gsap'
import { useScrollLock } from '../lib/smoothScroll'
import { IntroLeaf, HealthSwirl } from './Decor'

const money = (n) => `$${n.toFixed(2)}`

// Numbers count to their new value rather than snapping, so a quantity
// change reads as an increase.
function Amount({ value, className = '' }) {
  const ref = useRef(null)
  const state = useRef({ n: value })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced() || state.current.n === value) {
      state.current.n = value
      el.textContent = money(value)
      return
    }
    gsap.killTweensOf(state.current)
    gsap.to(state.current, {
      n: value,
      duration: 0.45,
      ease: 'power2.out',
      onUpdate: () => {
        el.textContent = money(state.current.n)
      },
      onComplete: () => {
        state.current.n = value
        el.textContent = money(value)
      },
    })
  }, [value])

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {money(value)}
    </span>
  )
}

// Height-collapsing wrapper used for the shipping bar, the subtotal block
// and "Empty the basket" — all of which only exist once there is something
// in the basket.
function Collapse({ open, className = '', children }) {
  const ref = useRef(null)
  const first = useRef(true)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const instant = first.current || reduced()
    first.current = false
    gsap.killTweensOf(el)
    if (instant) {
      gsap.set(el, { height: open ? 'auto' : 0, autoAlpha: open ? 1 : 0 })
      return
    }
    gsap.to(el, {
      height: open ? 'auto' : 0,
      autoAlpha: open ? 1 : 0,
      duration: open ? 0.5 : 0.38,
      ease: open ? 'power3.out' : 'power2.inOut',
    })
  }, [open])

  return (
    <div
      ref={ref}
      style={{ height: 0, visibility: 'hidden' }}
      className={`overflow-hidden ${className}`}
    >
      {children}
    </div>
  )
}

function BasketRow({ item, flash }) {
  const { setQty, removeItem } = useBasket()
  const rowRef = useRef(null)
  const qtyRef = useRef(null)
  const mounted = useRef(false)
  const lastQty = useRef(item.qty)

  // New lines slide in from the drawer's right edge.
  useLayoutEffect(() => {
    const el = rowRef.current
    if (!el || reduced()) return
    gsap.from(el, {
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      x: 40,
      autoAlpha: 0,
      duration: 0.55,
      ease: 'power3.out',
      clearProps: 'height,paddingTop,paddingBottom',
    })
  }, [])

  // Topping up an existing line pops its quantity.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      lastQty.current = item.qty
      return
    }
    if (item.qty === lastQty.current) return
    lastQty.current = item.qty
    if (!qtyRef.current || reduced()) return
    gsap.fromTo(
      qtyRef.current,
      { scale: 1.45 },
      { scale: 1, duration: 0.5, ease: 'back.out(3)', overwrite: 'auto' }
    )
  }, [item.qty])

  // Flash the row when it was the one just added to from a card.
  useEffect(() => {
    if (!flash || !rowRef.current || reduced()) return
    gsap.fromTo(
      rowRef.current,
      { backgroundColor: 'rgba(255,227,134,0.22)' },
      { backgroundColor: 'rgba(255,227,134,0)', duration: 1.1, ease: 'sine.out' }
    )
  }, [flash])

  const handleRemove = () => {
    const el = rowRef.current
    if (!el || reduced()) {
      removeItem(item.key)
      return
    }
    gsap.to(el, {
      x: 60,
      autoAlpha: 0,
      height: 0,
      paddingTop: 0,
      paddingBottom: 0,
      borderBottomWidth: 0,
      duration: 0.38,
      ease: 'power2.inOut',
      overwrite: 'auto',
      onComplete: () => removeItem(item.key),
    })
  }

  return (
    <li
      ref={rowRef}
      style={{ '--flavour': item.color }}
      className="group/row flex items-center gap-[1vw] max-md:gap-4 overflow-hidden rounded-lg border-b border-light-beige/10 py-[1vw] max-md:py-4"
    >
      <span
        aria-hidden="true"
        className="size-[2.6vw] max-md:size-11 shrink-0 rounded-md bg-(--flavour)"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-patrick-hand text32">{item.name}</p>
        <p className="truncate font-patrick-hand text-light-beige/55" style={{ fontSize: 'min(0.8rem, 1.8vh)' }}>
          {item.packLabel}
        </p>
      </div>

      <div className="flex items-center gap-[0.5vw] max-md:gap-2 shrink-0">
        <button
          type="button"
          aria-label={`Decrease ${item.name}`}
          onClick={() => setQty(item.key, item.qty - 1)}
          className="flex size-[1.6vw] max-md:size-7 cursor-pointer items-center justify-center rounded-md border border-light-beige/25 transition-colors duration-300 hover:bg-light-beige hover:text-foreground"
        >
          −
        </button>
        <span
          ref={qtyRef}
          className="inline-block w-[1.6vw] max-md:w-7 text-center font-patrick-hand tabular-nums will-change-transform"
        >
          {item.qty}
        </span>
        <button
          type="button"
          aria-label={`Increase ${item.name}`}
          disabled={item.qty >= MAX_QTY}
          onClick={() => setQty(item.key, item.qty + 1)}
          className="flex size-[1.6vw] max-md:size-7 cursor-pointer items-center justify-center rounded-md border border-light-beige/25 transition-colors duration-300 hover:bg-light-beige hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
        >
          +
        </button>
      </div>

      <Amount value={item.price * item.qty} className="w-[4vw] max-md:w-16 shrink-0 text-right font-patrick-hand" />

      <button
        type="button"
        aria-label={`Remove ${item.name}`}
        onClick={handleRemove}
        className="shrink-0 cursor-pointer font-patrick-hand text-light-beige/40 transition-colors duration-300 hover:text-beige"
        style={{ fontSize: 'min(0.85rem, 1.9vh)' }}
      >
        ×
      </button>
    </li>
  )
}

function BasketDrawer() {
  const {
    items,
    total,
    count,
    remainingForFreeShipping,
    isOpen,
    close,
    clear,
    lastTouched,
  } = useBasket()

  const scrimRef = useRef(null)
  const panelRef = useRef(null)
  const headerRef = useRef(null)
  const listRef = useRef(null)
  const footerRef = useRef(null)
  const emptyRef = useRef(null)
  const tl = useRef(null)
  const first = useRef(true)

  useScrollLock(isOpen)

  const hasItems = items.length > 0
  const freeShipping = remainingForFreeShipping <= 0
  const progress = Math.min(100, (total / FREE_SHIPPING_AT) * 100)

  // Ellipse wipe in from the right edge, contents arriving a beat behind it.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const scrim = scrimRef.current
    if (!panel || !scrim || reduced()) return undefined

    const parts = [headerRef.current, listRef.current, footerRef.current].filter(Boolean)

    const timeline = gsap
      .timeline({ paused: true })
      .set([scrim, panel], { autoAlpha: 1 })
      .fromTo(scrim, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0)
      .fromTo(
        panel,
        { clipPath: 'ellipse(0% 65% at 105% 50%)' },
        { clipPath: 'ellipse(150% 120% at 105% 50%)', duration: 1.15, ease: 'power3.inOut' },
        0
      )
      .fromTo(
        parts,
        { x: 28, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', stagger: 0.08 },
        0.35
      )

    tl.current = timeline
    return () => {
      timeline.kill()
      tl.current = null
    }
  }, [])

  useEffect(() => {
    const timeline = tl.current
    if (!timeline) return
    if (first.current) {
      first.current = false
      if (!isOpen) return
    }
    if (isOpen) timeline.timeScale(1).play()
    else timeline.timeScale(1.3).reverse()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (e) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  // Empty state fades between itself and the list.
  useEffect(() => {
    const el = emptyRef.current
    if (!el) return
    if (reduced()) {
      gsap.set(el, { autoAlpha: hasItems ? 0 : 1 })
      return
    }
    gsap.to(el, {
      autoAlpha: hasItems ? 0 : 1,
      duration: 0.35,
      ease: 'power2.out',
    })
  }, [hasItems])

  return (
    <>
      <div
        ref={scrimRef}
        onClick={close}
        aria-hidden="true"
        style={{ visibility: 'hidden' }}
        className={`fixed inset-0 z-800 bg-foreground/50 backdrop-blur-sm ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your basket"
        aria-hidden={!isOpen}
        style={{ clipPath: 'ellipse(0% 65% at 105% 50%)', visibility: 'hidden' }}
        className={`fixed right-0 top-0 z-900 h-full w-[32vw] max-md:w-full min-w-[320px] max-w-full bg-foreground text-light-beige ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <span className="absolute right-[-6vw] top-[-4vw] size-[24vw] max-md:size-[60vw] opacity-[0.07]">
            <HealthSwirl />
          </span>
        </div>

        <div className="relative z-10 flex h-full flex-col">
          <header
            ref={headerRef}
            className="relative z-10 flex shrink-0 items-start justify-between px-[2vw] pt-[2.2vw] pb-[1.2vw] max-md:px-6 max-md:pt-8 max-md:pb-4"
          >
            <div>
              <p className="text150 leading-none" style={{ fontSize: 'min(3.4vw, 5vh)' }}>
                Basket
              </p>
              <p className="text32 font-patrick-hand text-beige/80 tabular-nums">
                {count === 0
                  ? 'Nothing poured yet'
                  : `${count} ${count === 1 ? 'can pack' : 'can packs'} in`}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close basket"
              tabIndex={isOpen ? 0 : -1}
              onClick={close}
              className="group flex size-[2.4vw] max-md:size-10 shrink-0 cursor-pointer items-center justify-center rounded-md border border-light-beige/30 transition-all duration-300 hover:bg-light-beige hover:text-foreground active:scale-90"
            >
              <div className="size-[1.1vw] max-md:size-4 rotate-45 transition-transform duration-500 group-hover:rotate-135">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-full w-full">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
            </button>
          </header>

          <Collapse open={hasItems} className="relative z-10 shrink-0">
            <div className="px-[2vw] pb-[1.2vw] max-md:px-6 max-md:pb-4">
              <p
                className="font-patrick-hand text-beige tabular-nums"
                style={{ fontSize: 'min(0.95rem, 2.2vh)' }}
              >
                {freeShipping
                  ? 'Free shipping unlocked'
                  : `${money(remainingForFreeShipping)} away from free shipping`}
              </p>
              <div className="mt-[0.5vw] max-md:mt-2 h-[0.35vw] max-md:h-1.5 w-full overflow-hidden rounded-full bg-light-beige/15">
                <span
                  className="block h-full rounded-full bg-beige transition-[width] duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </Collapse>

          <div
            ref={listRef}
            data-lenis-prevent="true"
            className="relative z-10 flex-1 overflow-y-auto overscroll-contain px-[2vw] max-md:px-6"
          >
            <ul className="flex flex-col">
              {items.map((item) => (
                <BasketRow key={item.key} item={item} flash={item.key === lastTouched} />
              ))}
            </ul>

            <div
              ref={emptyRef}
              aria-hidden={hasItems}
              className="absolute inset-0 flex flex-col items-center justify-center gap-[0.8vw] max-md:gap-3 px-[2vw] max-md:px-6 text-center pointer-events-auto"
            >
              <span className="size-[7vw] max-md:size-24 opacity-40">
                <div className="size-full">
                  <IntroLeaf />
                </div>
              </span>
              <p className="text36 font-patrick-hand">Your basket is thirsty.</p>
              <a
                href="/flavours"
                tabIndex={isOpen && !hasItems ? 0 : -1}
                className="text32 cursor-pointer font-patrick-hand text-beige underline underline-offset-4 transition-opacity duration-300 hover:opacity-70"
              >
                Go pick a flavour
              </a>
            </div>
          </div>

          <footer
            ref={footerRef}
            className="relative z-10 shrink-0 border-t border-light-beige/15 px-[2vw] pb-[2vw] pt-[1.2vw] max-md:px-6 max-md:pb-8 max-md:pt-4"
          >
            <Collapse open={hasItems}>
              <div className="flex items-baseline justify-between">
                <p className="text32 font-patrick-hand">Subtotal</p>
                <p className="text32 font-patrick-hand tabular-nums">
                  <Amount value={total} />
                </p>
              </div>
              <div className="flex items-baseline justify-between text-light-beige/60">
                <p className="text32 font-patrick-hand">Shipping</p>
                <p className="text32 font-patrick-hand tabular-nums">Free</p>
              </div>
              <div className="my-[0.8vw] max-md:my-3 h-px w-full bg-light-beige/15" />
            </Collapse>

            <div className="flex items-baseline justify-between">
              <p className="text36 font-patrick-hand">Total</p>
              <Amount value={total} className="text150" />
            </div>

            <button
              type="button"
              disabled={!hasItems}
              tabIndex={isOpen ? 0 : -1}
              className="mt-[1vw] max-md:mt-4 w-full cursor-pointer rounded-md bg-beige py-[0.8vw] max-md:py-3.5 text36 font-patrick-hand text-foreground transition-all duration-300 hover:bg-light-beige hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:translate-y-0"
            >
              Checkout
            </button>

            <Collapse open={hasItems}>
              <button
                type="button"
                tabIndex={isOpen && hasItems ? 0 : -1}
                onClick={clear}
                style={{ fontSize: 'min(0.9rem, 2vh)' }}
                className="mt-[0.5vw] max-md:mt-2 w-full cursor-pointer font-patrick-hand text-light-beige/50 transition-colors duration-300 hover:text-light-beige"
              >
                Empty the basket
              </button>
            </Collapse>
          </footer>
        </div>
      </aside>
    </>
  )
}

export default BasketDrawer

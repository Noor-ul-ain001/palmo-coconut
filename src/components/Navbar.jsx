import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import PalmIcon from './PalmIcon'
import PalmBranch from './PalmBranch'
import BasketIcon from './BasketIcon'
import RollingNumber from './RollingNumber'
import { useBasket } from '../context/BasketContext'
import { gsap, reduced } from '../lib/gsap'
import { onLoaderCue } from '../lib/loaderCue'
import { useScrollLock } from '../lib/smoothScroll'
import { useNavDark } from '../lib/useNavDark'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Story', href: '/story' },
  { label: 'Flavours', href: '/flavours' },
  { label: 'Benefits', href: '/#benefits' },
  { label: 'Contact', href: '/#cta' },
]

const EMAIL = 'contact@vasavprajapati.com'

function MenuOverlay({ open, onClose }) {
  const rootRef = useRef(null)
  const linkRefs = useRef([])
  const contactRef = useRef(null)
  const tl = useRef(null)
  const first = useRef(true)
  const [copied, setCopied] = useState(false)

  useScrollLock(open)

  // Ellipse wipe down from the top edge, links rolling up from past
  // vertical behind it, then the contact block.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root || reduced()) return undefined

    const links = linkRefs.current.filter(Boolean)
    const contact = contactRef.current ? gsap.utils.toArray(contactRef.current.children) : []

    const timeline = gsap
      .timeline({ paused: true })
      .set(root, { autoAlpha: 1 })
      .fromTo(
        root,
        { clipPath: 'ellipse(75% 0% at 50% -5%)' },
        { clipPath: 'ellipse(105% 145% at 50% -5%)', duration: 1, ease: 'power3.inOut' }
      )
      .fromTo(
        links,
        { yPercent: 165, rotate: 4 },
        { yPercent: 0, rotate: 0, duration: 0.75, ease: 'power3.out', stagger: 0.06 },
        '-=0.45'
      )
      .fromTo(
        contact,
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power2.out', stagger: 0.08 },
        '-=0.5'
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
      if (!open) return
    }
    if (open) timeline.timeScale(1).play()
    else timeline.timeScale(1.4).reverse()
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
    } catch {
      // clipboard unavailable — still confirm, the address is on screen
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div
      ref={rootRef}
      aria-hidden={!open}
      className={`fixed inset-0 z-800 bg-foreground text-light-beige ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      style={{ clipPath: 'ellipse(75% 0% at 50% -5%)', visibility: 'hidden' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-[-15vw] size-[60vw] -translate-x-1/2 rounded-full opacity-25 blur-[8vw]"
          style={{ background: 'radial-gradient(circle, var(--gold), transparent 70%)' }}
        />
        <PalmBranch className="absolute bottom-[-10vw] max-md:bottom-[-14vh] left-1/2 w-[60vw] max-md:w-[210vw] -translate-x-1/2 max-md:-translate-x-[57%] opacity-10" />
      </div>

      <div className="paddx relative z-10 flex h-full w-full flex-col items-center justify-between py-[6vw] max-md:py-[8vh]">
        <nav className="flex flex-1 flex-col items-center justify-center">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              tabIndex={open ? 0 : -1}
              onClick={onClose}
              data-menu-link="true"
              style={{ fontSize: 'min(8vw, 13vh)' }}
              className="group flex justify-center overflow-hidden px-[0.5vw] pb-[0.18em] pt-[0.04em] [margin-block:-0.13em]"
            >
              <span
                className="block"
                ref={(el) => {
                  linkRefs.current[i] = el
                }}
              >
                <span
                  className="relative block whitespace-nowrap text150"
                  style={{ fontSize: 'inherit', lineHeight: 1 }}
                >
                  <span className="block">{link.label}</span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 block text-background [clip-path:inset(0_100%_0_0)] transition-[clip-path] duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] group-hover:[clip-path:inset(0_0_0_0)]"
                  >
                    {link.label}
                  </span>
                </span>
              </span>
            </a>
          ))}
        </nav>

        <div
          className="flex w-full flex-col items-center gap-[0.2vw] max-md:gap-1"
          ref={contactRef}
        >
          <p className="text36 font-patrick-hand text-beige">Say hello</p>
          <div className="flex items-center gap-[0.8vw] max-md:gap-2">
            <a
              href={`mailto:${EMAIL}`}
              tabIndex={open ? 0 : -1}
              className="text32 transition-colors duration-300 hover:text-beige"
            >
              {EMAIL}
            </a>
            <button
              type="button"
              tabIndex={open ? 0 : -1}
              aria-label={`Copy ${EMAIL}`}
              onClick={handleCopy}
              className="group relative flex size-[2vw] max-md:size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-all duration-300 active:scale-90 border-light-beige/40 text-light-beige hover:border-beige hover:bg-light-beige hover:text-foreground"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`absolute size-[1.1vw] max-md:size-4 transition-all duration-300 ${
                  copied ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
                }`}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className={`absolute size-[1.1vw] max-md:size-4 transition-all duration-300 ${
                  copied ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span
                style={{ fontSize: 'min(0.9rem, 2vh)' }}
                className={`pointer-events-none absolute bottom-[calc(100%+0.5vw)] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-beige px-[0.6vw] py-[0.2vw] font-patrick-hand text-foreground transition-all duration-300 ${
                  copied ? 'translate-y-0 opacity-100' : 'translate-y-[0.4vw] opacity-0'
                }`}
              >
                Copied!
              </span>
            </button>
          </div>
          <span className="sr-only" role="status" aria-live="polite">
            {copied ? 'Email copied to clipboard' : ''}
          </span>
        </div>
      </div>
    </div>
  )
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const { count, open: openBasket } = useBasket()
  const dark = useNavDark()

  const logoRef = useRef(null)
  const countRef = useRef(null)
  const firstCount = useRef(true)

  // Logo drops in once the loader releases, not while it is still covering.
  useLayoutEffect(() => {
    const el = logoRef.current
    if (!el) return undefined
    if (reduced()) {
      gsap.set(el, { yPercent: 0 })
      return undefined
    }
    gsap.set(el, { yPercent: -120 })
    return onLoaderCue(
      () => gsap.to(el, { yPercent: 0, duration: 0.85, ease: 'power3.out' }),
      { delay: 0.35 }
    )
  }, [])

  useEffect(() => {
    if (firstCount.current) {
      firstCount.current = false
      return
    }
    if (!countRef.current || reduced()) return
    gsap.fromTo(
      countRef.current,
      { scale: 1 },
      { scale: 1.3, duration: 0.22, ease: 'sine.out', yoyo: true, repeat: 1 }
    )
  }, [count])

  return (
    <>
      <MenuOverlay open={menuOpen} onClose={() => setMenuOpen(false)} />

      <nav className="fixed top-0 paddx flex overflow-x-hidden gap-[1vw] items-center justify-between py-[1.5vw] left-0 w-full z-900 max-md:py-4">
        <a
          aria-label="Home"
          href="/"
          className={`size-[4vw] max-md:size-11 flex items-center justify-center overflow-hidden transition-colors duration-500 ${
            dark ? 'text-light-beige' : 'text-foreground'
          }`}
        >
          <span className="block size-full will-change-transform" ref={logoRef}>
            <PalmIcon />
          </span>
        </a>

        <div className="w-fit gap-[.5vw] max-md:gap-2 flex items-center justify-center cursor-pointer">
          <button
            type="button"
            aria-label="Open basket"
            onClick={openBasket}
            className={`rounded-md relative size-[2.5vw] max-md:size-10 flex items-center justify-center p-[0.45vw] max-md:p-2 cursor-pointer transition-all duration-300 active:scale-90 ${
              dark
                ? 'bg-light-beige text-foreground'
                : 'bg-foreground text-light-beige hover:bg-light-beige hover:text-foreground'
            }`}
          >
            {count > 0 && (
              <p
                ref={countRef}
                className="text-[.6vw] max-md:text-[10px] border rounded-full size-[1.2vw] max-md:size-5 flex items-center justify-center absolute top-[-.5vw] right-[-.5vw] max-md:top-[-6px] max-md:right-[-6px] bg-beige text-foreground border-foreground"
              >
                <RollingNumber value={count} />
              </p>
            )}
            <BasketIcon />
          </button>

          <button
            type="button"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
            className={`text36 relative px-[2vw] py-[.3vw] max-md:px-5 max-md:py-2 font-patrick-hand rounded-md cursor-pointer overflow-hidden transition-colors duration-300 ${
              dark ? 'bg-light-beige text-foreground' : 'bg-foreground text-light-beige'
            }`}
          >
            <span className="grid">
              <span
                className={`col-start-1 row-start-1 transition-all duration-400 ${
                  menuOpen ? 'translate-y-[-130%] opacity-0' : 'translate-y-0 opacity-100'
                }`}
              >
                MENU
              </span>
              <span
                className={`col-start-1 row-start-1 transition-all duration-400 ${
                  menuOpen ? 'translate-y-0 opacity-100' : 'translate-y-[130%] opacity-0'
                }`}
              >
                CLOSE
              </span>
            </span>
          </button>
        </div>
      </nav>
    </>
  )
}

export default Navbar

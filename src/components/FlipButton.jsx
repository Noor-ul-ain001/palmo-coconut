import { useCallback, useRef } from 'react'
import { gsap, reduced } from '../lib/gsap'
import { useFlipHover } from '../lib/useFlipHover'

// Two stacked copies of each letter inside a 1.55em mask: the column slides
// up half its height on hover so the second copy takes the first's place.
export function FlipWord({ word }) {
  return (
    <span className="inline-flex">
      {word.split('').map((char, i) => (
        <span
          key={i}
          className="relative inline-block h-[1.55em] -my-[0.175em] overflow-hidden align-bottom"
        >
          <span
            data-char
            className="flex flex-col leading-[1.55] will-change-transform"
          >
            <span>{char}</span>
            <span>{char}</span>
          </span>
        </span>
      ))}
    </span>
  )
}

function FlipButton({ href, label, words, className = '' }) {
  const btnRef = useRef(null)
  const blobRef = useRef(null)

  // The sketched outline is part of the resting design, so hover re-draws
  // it from the start rather than revealing it — it always ends full.
  const onEnter = useCallback(() => {
    if (!blobRef.current || reduced()) return
    gsap.killTweensOf(blobRef.current)
    gsap.fromTo(
      blobRef.current,
      { drawSVG: '0% 0%' },
      { drawSVG: '0% 100%', duration: 0.55, ease: 'power2.inOut' }
    )
  }, [])

  const onLeave = useCallback(() => {
    if (!blobRef.current || reduced()) return
    gsap.killTweensOf(blobRef.current)
    gsap.to(blobRef.current, { drawSVG: '0% 100%', duration: 0.3, ease: 'power2.out' })
  }, [])

  useFlipHover(btnRef, { onEnter, onLeave })

  return (
    <a href={href}>
      <button
        type="button"
        ref={btnRef}
        aria-label={label}
        className={`relative inline-flex cursor-pointer items-center justify-center text-foreground will-change-transform ${className}`}
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 208 74"
          fill="none"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            ref={blobRef}
            d="M118.8 65.7551C118.8 65.7551 9.54145 66.2038 2.20331 40.1869C-5.73315 12.0488 55.2778 1.5 95.5383 1.5C135.799 1.5 195.672 4.08468 205.776 31.8674C219.086 68.4625 44.4656 72.5 44.4656 72.5"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        <span
          aria-hidden="true"
          className="font-patrick-hand relative z-1 flex gap-[0.3em] px-[1.5vw] py-[0.8vw] pb-[1vw]! text-[1.3rem] leading-[1.2] tracking-[-0.04em] whitespace-nowrap max-md:px-6 max-md:py-3 max-md:pb-3.5!"
        >
          {words.map((word) => (
            <FlipWord word={word} key={word} />
          ))}
        </span>
        <span className="sr-only">{label}</span>
      </button>
    </a>
  )
}

export default FlipButton

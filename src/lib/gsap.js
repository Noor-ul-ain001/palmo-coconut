import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { Draggable } from 'gsap/Draggable'

// Registered once, here, so no component has to think about plugin setup.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, InertiaPlugin, Draggable)

// Single source of truth for "should we animate at all". Read it at call
// time rather than caching, so a mid-session OS preference change is honoured.
export const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

export { gsap, useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, InertiaPlugin, Draggable }

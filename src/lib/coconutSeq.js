export const SEQ = {
  shake: 'coconut:shake',
  burst: 'coconut:burst',
  can: 'coconut:can',
  reset: 'coconut:reset',
}

export function emitSeq(event, detail) {
  window.dispatchEvent(new CustomEvent(event, { detail }))
}

export function onSeq(event, handler) {
  window.addEventListener(event, handler)
  return () => window.removeEventListener(event, handler)
}

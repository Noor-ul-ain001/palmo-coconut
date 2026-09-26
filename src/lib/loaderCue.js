// Entrance animations across the site wait on the preloader instead of
// firing underneath it. Components register a cue; the preloader flushes
// them all when it finishes (or immediately, if it never ran).
let done = false
const pending = new Set()

function flush() {
  pending.forEach((entry) => entry.fire())
  pending.clear()
}

if (typeof window !== 'undefined') {
  window.addEventListener('palmo:loader-done', () => {
    if (done) return
    done = true
    flush()
  })
}

export function isLoaderDone() {
  return done
}

// Returns an unsubscribe so a component unmounting before the loader
// finishes never fires a tween against a dead ref.
export function onLoaderCue(fn, { delay = 0 } = {}) {
  let timer = null
  let cancelled = false

  const fire = () => {
    if (cancelled) return
    if (delay > 0) timer = setTimeout(fn, delay * 1000)
    else fn()
  }

  if (done) {
    fire()
  } else {
    const entry = { fire }
    pending.add(entry)
    return () => {
      cancelled = true
      pending.delete(entry)
      clearTimeout(timer)
    }
  }

  return () => {
    cancelled = true
    clearTimeout(timer)
  }
}

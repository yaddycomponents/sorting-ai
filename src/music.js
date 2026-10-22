// The opening theme (public/theme/hedwig.mp3): fades in on the intro, out when we move on.
let el = null
let fade = null

function theme() {
  if (!el) {
    el = new Audio('/theme/hedwig.mp3')
    el.loop = true
    el.preload = 'auto'
    el.volume = 0
  }
  return el
}

function fadeTo(target, ms, then) {
  const a = theme()
  clearInterval(fade)
  const from = a.volume
  const t0 = performance.now()
  fade = setInterval(() => {
    const p = Math.min(1, (performance.now() - t0) / ms)
    a.volume = from + (target - from) * p
    if (p === 1) { clearInterval(fade); then?.() }
  }, 30)
}

// Fetch it as soon as the page opens, so the intro click plays it at once
// (on the live site a 1.25 MB download after the click felt like nothing happened).
if (typeof window !== 'undefined') theme().load()

let pending = false
export const themePlaying = () => !!el && !el.paused
// true while play() has been called but the audio hasn't started yet
export const themeStarting = () => pending

// Must be called from a click/key handler: browsers only allow audio after a gesture.
export function playTheme() {
  const a = theme()
  fadeTo(0.8, 2500)
  pending = true
  return a.play().then(() => { pending = false; return true }, (err) => {
    pending = false
    console.warn('[theme] could not play:', err.name, err.message)
    return false
  })
}

export function stopTheme() {
  if (!el || el.paused) return
  fadeTo(0, 1500, () => el.pause())
}

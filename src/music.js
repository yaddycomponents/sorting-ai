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

export const themePlaying = () => !!el && !el.paused

// Must be called from a click/key handler: browsers only allow audio after a gesture.
export function playTheme() {
  const a = theme()
  fadeTo(0.8, 2500)
  return a.play().then(() => true, (err) => {
    console.warn('[theme] could not play:', err.name, err.message)
    return false
  })
}

export function stopTheme() {
  if (!el || el.paused) return
  fadeTo(0, 1500, () => el.pause())
}

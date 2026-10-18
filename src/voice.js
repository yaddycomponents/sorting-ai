// The Hat's voice: clips cut from the Fish Audio batches into public/voice/<name>.mp3.
// One clip at a time; a new line cuts off the previous one.

const cache = new Map()
let current = null
let muted = false

function clip(name) {
  if (!cache.has(name)) {
    const a = new Audio(`/voice/${name}.mp3`)
    a.preload = 'auto'
    cache.set(name, a)
  }
  return cache.get(name)
}

// Listeners told when each line actually starts playing (Snape flicks on his retort).
const listeners = new Set()
export function onLine(fn) { listeners.add(fn); return () => listeners.delete(fn) }

let chain = 0 // bumps on every new line, so a pending follow-up is cancelled

// Play a line; with more names, play them back to back (Ron, then Snape's retort).
// A missing clip is skipped rather than stalling the rest of the exchange.
export function say(name, ...then) {
  if (!name) return
  const id = ++chain
  current?.pause()
  if (muted) return
  const a = clip(name)
  current = a
  a.currentTime = 0
  let next = null
  if (then.length) {
    next = () => { a.removeEventListener('ended', next); a.removeEventListener('error', next); if (id === chain) setTimeout(() => id === chain && say(...then), 250) }
    a.addEventListener('ended', next)
    a.addEventListener('error', next)
  }
  // autoplay is blocked until the first click/key; a clip that already failed to
  // load won't fire 'error' again, so move on to the next line ourselves
  a.play().then(() => listeners.forEach((fn) => fn(name)), () => { if (a.error) next?.() })
}

export function hush() {
  chain++
  current?.pause()
}

export function toggleMute() {
  muted = !muted
  if (muted) hush()
  return muted
}

export const thinking = () => say(`think-${1 + Math.floor(Math.random() * 3)}`)

// Sound effects on their own channel, so they never cut a voice line.
const sfx = new Map()
export function playSfx(name, volume = 0.7) {
  if (muted) return
  if (!sfx.has(name)) sfx.set(name, new Audio(`/${name}.mp3`))
  const a = sfx.get(name)
  a.volume = volume
  a.currentTime = 0
  a.play().catch(() => {})
}

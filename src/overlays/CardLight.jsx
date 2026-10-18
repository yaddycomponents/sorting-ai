import { useEffect, useRef } from 'react'
import { patronusScreen } from '../three/Patronus'

// The card forms from Patronus light: particles stream from the animal, trace
// the card's rounded outline and write its words; the words then glow as light
// with dust twinkling on them (dots alone can't make 15px text readable); a few
// motes keep drifting round its edge until the next spell.
const START = 1700 // ms after the cast: once the Patronus has taken shape
const FLY = 1000 // ms to reach the card
const EDGE = 700 // particles on the outline
const TEXT = 5000 // particles that write the words, before the glyphs light up
const MOTES = 70

// a point on a rounded rectangle's perimeter, u in [0, 1)
function perimeter(r, rad, u) {
  const w = r.width - 2 * rad
  const h = r.height - 2 * rad
  const arc = (Math.PI / 2) * rad
  const L = 2 * w + 2 * h + 4 * arc
  let d = u * L
  const seg = [
    [w, (s) => [r.left + rad + s, r.top]],
    [arc, (s) => corner(r.right - rad, r.top + rad, -Math.PI / 2 + s / rad)],
    [h, (s) => [r.right, r.top + rad + s]],
    [arc, (s) => corner(r.right - rad, r.bottom - rad, s / rad)],
    [w, (s) => [r.right - rad - s, r.bottom]],
    [arc, (s) => corner(r.left + rad, r.bottom - rad, Math.PI / 2 + s / rad)],
    [h, (s) => [r.left, r.bottom - rad - s]],
    [arc, (s) => corner(r.left + rad, r.top + rad, Math.PI + s / rad)],
  ]
  function corner(cx, cy, a) { return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] }
  for (const [len, at] of seg) { if (d <= len) return at(d); d -= len }
  return [r.left + rad, r.top]
}

const ease = (x) => 1 - Math.pow(1 - x, 3)

// Where the card's words are, as pixels: each word is measured in place (a DOM
// Range) and redrawn in its own font on an offscreen canvas, then sampled.
function textPixels(el, r) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(r.width)
  c.height = Math.ceil(r.height)
  const g = c.getContext('2d', { willReadFrequently: true })
  g.fillStyle = '#fff'
  g.textBaseline = 'middle'
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const st = getComputedStyle(n.parentElement)
    g.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
    g.letterSpacing = st.letterSpacing === 'normal' ? '0px' : st.letterSpacing
    const upper = st.textTransform === 'uppercase'
    for (const m of n.textContent.matchAll(/\S+/g)) {
      range.setStart(n, m.index)
      range.setEnd(n, m.index + m[0].length)
      const b = range.getClientRects()[0]
      if (!b) continue
      g.fillText(upper ? m[0].toUpperCase() : m[0], b.left - r.left, b.top - r.top + b.height / 2)
    }
  }
  const d = g.getImageData(0, 0, c.width, c.height).data
  const pts = []
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] > 110) pts.push([r.left + x, r.top + y])
  }
  return pts
}

// cast: the current spell (key changes per cast); cardRef: the card element
export function CardLight({ cast, cardRef }) {
  const ref = useRef()

  useEffect(() => {
    const cv = ref.current
    const fit = () => { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d }
    fit()
    addEventListener('resize', fit)
    return () => removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    if (!cast) return
    const cv = ref.current
    const g = cv.getContext('2d')
    const dpr = cv.width / innerWidth
    // the spell's colour: halo in full colour, core near-white tinted toward it
    const n = parseInt((cast.color ?? '#96c3ff').slice(1), 16)
    const [R, G, B] = [n >> 16, (n >> 8) & 255, n & 255]
    const halo = (a) => `rgba(${R},${G},${B},${a})`
    const core = (a) => `rgba(${(R + 510) / 3 | 0},${(G + 510) / 3 | 0},${(B + 510) / 3 | 0},${a})`
    // the mouse parts the light: each mote is pushed out of a ~90 px circle and springs back
    const mouse = { x: -1e4, y: -1e4 }
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
    addEventListener('pointermove', onMove)
    let raf
    let parts = null
    let rect = null
    const t0 = performance.now()

    const spawn = () => {
      const el = cardRef.current
      if (!el) return false
      rect = el.getBoundingClientRect()
      if (rect.width < 10) return false
      const ox = patronusScreen.x || innerWidth * 0.5
      const oy = patronusScreen.y || innerHeight * 0.45
      const words = textPixels(el, rect)
      const mk = (tx, ty, edge) => ({
        x: ox + (Math.random() - 0.5) * 120, y: oy + (Math.random() - 0.5) * 120,
        tx, ty, edge, delay: Math.random() * 0.4, r: edge ? 0.8 + Math.random() * 1.1 : 0.5 + Math.random() * 0.3,
        bow: (Math.random() - 0.5) * 220, ph: Math.random() * 6.283,
      })
      parts = []
      for (let i = 0; i < EDGE; i++) parts.push(mk(...perimeter(rect, 14, Math.random()), true))
      for (let i = 0; i < TEXT && words.length; i++) parts.push(mk(...words[Math.floor(Math.random() * words.length)], false))
      return true
    }

    // text dots: sharp points with a faint halo, so letters stay legible
    const spark = (x, y, r, a) => {
      g.fillStyle = halo(0.07 * a)
      g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4)
      g.fillStyle = core(0.95 * a)
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
    const dot = (x, y, r, a) => {
      g.fillStyle = halo(0.12 * a)
      g.beginPath(); g.arc(x, y, r * 4, 0, 6.283); g.fill()
      g.fillStyle = core(0.9 * a)
      g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill()
    }

    const tick = (now) => {
      // window.__cardLightFreeze pins the clock (screenshot checks on slow renderers)
      const ms = window.__cardLightFreeze ?? now - t0
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, innerWidth, innerHeight)
      g.globalCompositeOperation = 'lighter'
      if (ms >= START && !parts && !spawn()) { raf = requestAnimationFrame(tick); return }
      if (parts) {
        const t = (ms - START) / 1000
        const fly = FLY / 1000
        for (const p of parts) {
          const k = Math.min(1, Math.max(0, (t - p.delay) / fly))
          if (k <= 0) continue
          const e = ease(k)
          // a curved stream: bow sideways mid-flight, settle exactly on target
          const bx = Math.sin(e * Math.PI) * p.bow
          const x = p.x + (p.tx - p.x) * e + bx * 0.3
          const y = p.y + (p.ty - p.y) * e + bx
          // once landed: the outline stays as light; on the words most dots melt
          // into the glowing glyphs and ~1 in 6 stays behind as twinkling dust
          const after = t - p.delay - fly
          const settled = after > 0
          const keep = p.edge || p.ph < 1.05
          const fade = settled && !keep ? Math.max(0, 1 - after / 0.9) : 1
          const tw = settled ? 0.55 + 0.45 * Math.sin(t * 2.5 + p.ph * 3) : 0.7 + 0.3 * Math.sin(t * 9 + p.ph)
          const jx = settled ? 0 : Math.sin(t * 7 + p.ph) * 0.6
          if (fade <= 0) continue
          if (settled) {
            const dx = x - mouse.x, dy = y - mouse.y, d = Math.hypot(dx, dy) || 1
            const push = Math.max(0, 90 - d) / 90
            p.ox = (p.ox ?? 0) * 0.86 + (dx / d) * push * 34 * 0.14
            p.oy = (p.oy ?? 0) * 0.86 + (dy / d) * push * 34 * 0.14
          }
          const ox = p.ox ?? 0, oy = p.oy ?? 0
          const lift = 1 + Math.min(1, Math.hypot(ox, oy) / 20) * 0.8 // pushed motes flare
          if (p.edge) dot(x + jx + ox, y + oy, p.r * lift, tw)
          else spark(x + jx + ox, y + oy, p.r * lift, tw * fade * (settled && keep ? 0.8 : 1))
        }
        // afterwards, motes drift round the edge for as long as the card is open
        const motes = Math.max(0, Math.min(1, (t - fly - 0.2) / 0.6))
        if (motes > 0 && rect) {
          for (let i = 0; i < MOTES; i++) {
            const u = (i / MOTES + t * 0.018) % 1
            const [x, y] = perimeter(rect, 14, u)
            const tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)
            dot(x, y, 1.1, motes * 0.55 * tw)
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height) }
  }, [cast, cardRef])

  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 3, pointerEvents: 'none' }} />
}

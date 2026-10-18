import { useEffect, useRef } from 'react'
import WebGLFluidEnhanced from 'webgl-fluid-enhanced'

// Shared fluid-ink layer for the spell effects (Snape's lesson, Ron vs Snape at the gates).

const FLUID = {
  transparent: true, hover: false,
  simResolution: 128, dyeResolution: 1024,
  densityDissipation: 2.2, velocityDissipation: 1.2, pressure: 0.8, curl: 22,
  splatRadius: 0.022, splatForce: 6000,
  shading: true, colorful: false, brightness: 0.55,
  bloom: false, sunrays: false, // bloom whitens the background, which breaks transparency
}

// The spell's colour as dye. splatAtLocation() goes through a hex parser that
// returns 0–255 and then ×10, which saturates to white, so we call the
// simulation's own splat() with 0–1 floats instead.
function dye(hex, k) {
  const n = parseInt(hex.slice(1), 16)
  return { r: ((n >> 16) / 255) * k, g: (((n >> 8) & 255) / 255) * k, b: ((n & 255) / 255) * k }
}

// Mounts the fluid canvas into the returned ref's element.
export function useFluid() {
  const box = useRef()
  const fluid = useRef()
  useEffect(() => {
    const f = new WebGLFluidEnhanced(box.current)
    f.setConfig(FLUID)
    f.start()
    fluid.current = f
    return () => f.stop()
  }, [])
  return { box, fluid }
}

// Pour ink along a quadratic arc from → to (screen px), then bloom where it lands.
// fizzle: the stream breaks up halfway and sputters out (Ron's broken wand).
// Returns a cancel function.
export function pour(f, { from, to, color, delay = 0, dur = 750, lift = 0.22, fizzle = false }) {
  if (!f) return () => {}
  const sim = f.simulation
  // screen px → the sim's 0–1 space (y up)
  const splat = (x, y, dx, dy, c) => sim.splat(x / sim.canvas.clientWidth, 1 - y / sim.canvas.clientHeight, dx, dy, c)
  const ctrl = { x: (from.x + to.x) / 2, y: Math.min(from.y, to.y) - window.innerHeight * lift }
  const end = fizzle ? 0.55 : 1

  let raf
  const t0 = performance.now() + delay
  let burst = false
  let n = 0
  const tick = (now) => {
    const p = (now - t0) / dur
    if (p >= 0 && p <= end && n++ % 2 === 0) {
      const u = 1 - p
      const x = u * u * from.x + 2 * u * p * ctrl.x + p * p * to.x
      const y = u * u * from.y + 2 * u * p * ctrl.y + p * p * to.y
      const tx = 2 * u * (ctrl.x - from.x) + 2 * p * (to.x - ctrl.x)
      const ty = 2 * u * (ctrl.y - from.y) + 2 * p * (to.y - ctrl.y)
      const len = Math.hypot(tx, ty) || 1
      // taper the ink over the last fifth so it doesn't pile up white at the end
      const strength = p < end * 0.8 ? 1 : Math.max(0.15, (end - p) / (end * 0.2))
      const wob = fizzle ? (Math.random() - 0.5) * 120 : 0 // a broken wand doesn't hold a line
      splat(x, y, (tx / len) * 70 + wob, (-ty / len) * 70 + wob, dye(color, 1.6 * strength))
    }
    if (p > end && !burst) {
      burst = true
      const at = fizzle
        ? { x: (from.x + ctrl.x) / 2, y: (from.y + ctrl.y) / 2 }
        : to
      const k0 = fizzle ? 7 : 4
      for (let k = 0; k < k0; k++) {
        const a = (k / k0) * Math.PI * 2 + 0.4
        const v = fizzle ? 60 + Math.random() * 90 : 110
        splat(at.x + Math.cos(a) * 10, at.y + Math.sin(a) * 10, Math.cos(a) * v, -Math.sin(a) * v, dye(color, fizzle ? 0.35 : 0.45))
      }
    }
    if (p < end + 0.05) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(raf)
}

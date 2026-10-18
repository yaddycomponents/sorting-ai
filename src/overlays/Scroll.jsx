import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { hall as t } from '../theme'

const ease = [0.22, 1, 0.36, 1]

export const hand = "'IM Fell English', 'Cormorant Garamond', Georgia, serif"

// Ink colours that read on parchment (the house glows are tuned for dark backgrounds).
export const ink = {
  gryffindor: '#8e1b1b',
  hufflepuff: '#8a6410',
  ravenclaw: '#24387a',
  slytherin: '#1f5a36',
}

// A rolled wooden rod with dark knobs at both ends.
function Rod() {
  return (
    <div style={{ position: 'relative', height: 22, margin: '0 -10px', zIndex: 1 }}>
      <div style={{ position: 'absolute', inset: '2px 10px', borderRadius: 11, background: 'linear-gradient(180deg, #f3dfae 0%, #d8b878 35%, #a9823f 70%, #6e4f22 100%)', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} />
      {[0, 1].map((s) => (
        <div key={s} style={{ position: 'absolute', top: 0, [s ? 'right' : 'left']: 0, width: 14, height: 22, borderRadius: 5, background: 'linear-gradient(90deg, #3d2610, #6b4520 50%, #3d2610)', boxShadow: '0 3px 8px rgba(0,0,0,0.5)' }} />
      ))}
    </div>
  )
}

// A parchment scroll that unrolls downward. `glow` lights it from behind.
export function Scroll({ children, delay = 0, glow, style, pad = '22px 26px' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5, ease }}
      style={{ position: 'relative', display: 'flex', flexDirection: 'column', filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.55))${glow ? ` drop-shadow(0 0 40px ${glow})` : ''}`, ...style }}>
      <Rod />
      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} transition={{ delay: delay + 0.15, duration: 0.9, ease }}
        style={{ overflow: 'hidden', margin: '-6px 0' }}>
        <div style={{
          padding: pad, color: t.parchmentInk, fontFamily: t.serif,
          background: `linear-gradient(90deg, rgba(122,92,48,0.28), transparent 7%, transparent 93%, rgba(122,92,48,0.28)), radial-gradient(ellipse at 30% 20%, #f4e7c6, ${t.parchmentDeep} 140%)`,
          boxShadow: 'inset 0 10px 14px -8px rgba(90,60,20,0.35), inset 0 -10px 14px -8px rgba(90,60,20,0.35)',
        }}>
          {children}
        </div>
      </motion.div>
      <Rod />
    </motion.div>
  )
}

// A wax seal disc with an icon pressed into it.
export function Seal({ color, Icon, size = 46 }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `radial-gradient(circle at 35% 30%, ${color}ee, ${color} 55%, #000000aa 140%)`,
      boxShadow: `0 0 0 3px ${color}55, inset 0 2px 4px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.35), 0 3px 8px rgba(0,0,0,0.35)` }}>
      <Icon size={size * 0.42} color="#f6ead0" strokeWidth={1.8} />
    </div>
  )
}

// Night sky: a deterministic star field, a few stars twinkling.
export function Starfield() {
  const stars = useMemo(() => Array.from({ length: 160 }, (_, i) => {
    const r = (k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) }
    return { x: r(1) * 100, y: r(2) * 100, s: 0.6 + r(3) * 1.6, o: 0.2 + r(4) * 0.6, tw: r(5) < 0.25, d: 2 + r(6) * 4 }
  }), [])
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', background: `radial-gradient(ellipse 90% 70% at 50% 0%, #141a3a 0%, ${t.night} 70%)` }}>
      {stars.map((s, i) => (
        <motion.div key={i} animate={s.tw ? { opacity: [s.o, s.o * 0.2, s.o] } : undefined} transition={s.tw ? { duration: s.d, repeat: Infinity, ease: 'easeInOut' } : undefined}
          style={{ position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, borderRadius: '50%', background: '#fff', opacity: s.o }} />
      ))}
    </div>
  )
}

// The connector between scrolls: a gold line with a diamond.
export function Link({ delay }) {
  return (
    <motion.svg width="40" height="12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay, duration: 0.4 }} style={{ flexShrink: 0, alignSelf: 'center' }}>
      <line x1="0" y1="6" x2="30" y2="6" stroke={t.gold} strokeWidth="1.2" />
      <path d="M30 6 L34 2 L38 6 L34 10 Z" fill={t.gold} />
    </motion.svg>
  )
}

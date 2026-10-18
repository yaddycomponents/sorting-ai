import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { wandTip } from '../three/Snape'
import { useFluid, pour } from './fluid'
import { patronusScreen } from '../three/Patronus'

// Each spell's wand motion (after the "how they are cast" idea), in a 200×200 box.
const GESTURES = {
  T1: 'M20 140 C 60 30, 150 30, 165 115 S 100 175, 70 120', // Mischief Managed: a closing loop
  T2: 'M20 150 Q 100 5 180 150', // Accio: one pulling arc
  T3: 'M25 45 L 75 155 L 105 70 L 145 160 L 178 45', // Revelio: zig-zag reveal
  T4: 'M45 100 a 28 28 0 1 0 56 0 a 28 28 0 1 0 -56 0 M 101 100 H 182 M 150 100 V 126 M 172 100 V 120', // Gringotts: a key
  T5: 'M20 55 H 178 Q 196 77 178 100 H 22 Q 4 122 22 145 H 180', // Room of Requirement: walk past three times
  T6: 'M100 185 V 55 Q 100 18 136 30', // Ask Hermione: a raised hand
}

// cast: { i, key, color, code }: each cast draws its wand gesture and pours ink to
// where the Patronus (3D, three/Patronus.jsx) erupts.
export function SpellFx({ cast }) {
  const { box, fluid } = useFluid()
  const [glyph, setGlyph] = useState(null)

  useEffect(() => {
    if (!cast || !fluid.current) return
    const from = wandTip.ok ? { x: wandTip.x, y: wandTip.y } : { x: window.innerWidth * 0.32, y: window.innerHeight * 0.5 }
    setGlyph({ key: cast.key, code: cast.code, color: cast.color, x: from.x, y: from.y })
    // the gesture is drawn first, then the ink flies to where the Patronus will rise
    return pour(fluid.current, { from, to: { ...patronusScreen }, color: cast.color, delay: 380 })
  }, [cast, fluid])

  return (
    <>
      <div ref={box} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
      <AnimatePresence>
        {glyph && <Gesture key={glyph.key} code={glyph.code} color={glyph.color} x={glyph.x} y={glyph.y} onDone={() => setGlyph(null)} />}
      </AnimatePresence>
    </>
  )
}

// The wand motion, drawn as a glass stroke: a soft coloured glow, a bright
// gradient body, and a thin white core.
function Gesture({ code, color, x, y, onDone }) {
  const id = `g${code}`
  const d = GESTURES[code]
  const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.55, ease: [0.65, 0, 0.35, 1] } }
  return (
    <motion.svg viewBox="0 0 200 200" width={190} height={190}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.08, filter: 'blur(6px)' }}
      transition={{ duration: 0.35 }}
      onAnimationComplete={() => setTimeout(onDone, 900)}
      style={{ position: 'fixed', left: x - 30, top: y - 175, zIndex: 1, pointerEvents: 'none', overflow: 'visible', mixBlendMode: 'screen' }}>
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor={color} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.7" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <motion.path d={d} {...draw} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" filter={`url(#${id}-glow)`} />
      <motion.path d={d} {...draw} fill="none" stroke={`url(#${id}-glass)`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <motion.path d={d} {...draw} fill="none" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </motion.svg>
  )
}

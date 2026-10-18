import { motion } from 'framer-motion'
import { hall as t } from '../theme'

// Easter egg: pester Snape five times and he casts the Killing Curse.
// A green flash, then the "site" dies: black screen, everything silent.
// (Browsers won't let a page close a tab it didn't open, and a real close would
// end the demo, so this fakes it.) Any key or click revives the deck.
export const HIT = 2.05 // s: Snape finishes "Kedavra" (public/avada.mp3); the burst (avada-hit.mp3) and flash land here
// revival only once the screen has died, so a stray click can't cancel the curse
export const DEAD_AFTER = (HIT + 1.2) * 1000

export function Avada({ onRevive }) {
  return (
    <div onClick={(e) => { e.stopPropagation(); onRevive(false) }}
      style={{ position: 'fixed', inset: 0, zIndex: 100, cursor: 'none', pointerEvents: 'auto' }}>
      {/* the incantation: a green glow gathers at Snape's wand while he speaks */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.25, 0.55] }} transition={{ duration: HIT, times: [0, 0.45, 1], ease: 'easeIn' }}
        style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 55%, rgba(60,255,120,0.55) 0%, rgba(15,174,69,0.25) 18%, transparent 45%)' }} />
      {/* the curse lands with the sound's burst: a blinding green flash */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ delay: HIT, duration: 1.1, times: [0, 0.12, 0.45, 1] }}
        style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 55%, #e9ffe9 0%, #3cff7a 18%, #0fae45 45%, #03200c 100%)' }} />
      {/* …and then nothing */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: HIT + 0.7, duration: 0.4 }}
        style={{ position: 'absolute', inset: 0, background: '#000' }} />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} transition={{ delay: HIT + 4, duration: 3 }}
        style={{ position: 'absolute', left: 0, right: 0, bottom: '8vh', textAlign: 'center', fontFamily: t.serif, fontStyle: 'italic', fontSize: 18, color: '#7a8a7a' }}>
        “Turn to page three hundred and ninety-four.”
      </motion.div>
    </div>
  )
}

import { motion } from 'framer-motion'
import { hall as t, houses } from '../theme'

// Easter egg payoff: the Hat, pestered, sorts the presenter into Slytherin.
export function Sorted() {
  const h = houses.slytherin
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 6, times: [0, 0.08, 0.85, 1] }}
      style={{ position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(26,71,42,0.55), rgba(4,12,8,0.85) 70%)' }}>
      <motion.img src={h.crest} alt="" initial={{ scale: 0.4, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}
        style={{ width: 'min(28vh, 260px)', filter: 'drop-shadow(0 0 40px rgba(79,208,122,0.6))' }} />
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }}
        style={{ fontFamily: t.decorative, fontSize: 'clamp(48px, 7vw, 110px)', fontWeight: 900, color: h.glow, textShadow: '0 0 30px rgba(79,208,122,0.7)', letterSpacing: '0.04em' }}>
        SLYTHERIN!
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.6 }}
        style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 'clamp(18px, 1.6vw, 24px)', color: t.ink }}>
        Sorted for impatience. The Hat has spoken.
      </motion.div>
    </motion.div>
  )
}

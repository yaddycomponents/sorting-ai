import { motion } from 'framer-motion'
import { hall as t } from '../theme'

const ease = [0.22, 1, 0.36, 1]

const gold = { background: t.goldGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }

export function Title() {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: '5vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, pointerEvents: 'none' }}>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8, ease }}
        style={{ fontFamily: t.display, fontSize: 13, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: t.gold }}>
        Growfin · AI Auto-Reply & AI Actions
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.9, duration: 1.2, ease }}
        style={{ fontFamily: t.decorative, fontSize: 'clamp(44px, 6vw, 100px)', fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em', ...gold, filter: 'drop-shadow(0 4px 30px rgba(212,175,55,0.35))' }}>
        The Sorting Hat
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 1 }}
        style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 'clamp(18px, 1.7vw, 26px)', color: t.muted }}>
        “There's nothing hidden in your head the Sorting Hat can't see.”
      </motion.div>
    </div>
  )
}

export function Fin() {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: '9vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, pointerEvents: 'none' }}>
      <motion.div initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 0.5, duration: 1.2, ease }}
        style={{ fontFamily: t.decorative, fontSize: 'clamp(42px, 5.5vw, 92px)', fontWeight: 900, ...gold }}>
        Mischief managed.
      </motion.div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}
        style={{ fontFamily: t.display, fontSize: 14, letterSpacing: '0.4em', textTransform: 'uppercase', color: t.muted }}>
        Questions for the Hat
      </motion.div>
    </div>
  )
}

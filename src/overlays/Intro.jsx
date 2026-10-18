import { motion } from 'framer-motion'
import { hall as t } from '../theme'

const ease = [0.22, 1, 0.36, 1]
const gold = { background: t.goldGrad, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }

// Opening shot: the castle at night (3D, see World's intro shot), then the title.
export function Intro({ started }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 4, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* the 3D castle shows through; just a floor of darkness for the title */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, transparent 52%, rgba(4,6,12,0.85) 86%)' }} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: '9vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, pointerEvents: 'none', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 1.2, ease }}
          style={{ fontFamily: t.display, fontSize: 14, fontWeight: 600, letterSpacing: '0.5em', textTransform: 'uppercase', color: t.gold }}>
          Growfin presents
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24, filter: 'blur(12px)' }} animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }} transition={{ delay: 2.2, duration: 1.8, ease }}
          style={{ fontFamily: t.decorative, fontSize: 'clamp(52px, 7.5vw, 128px)', fontWeight: 900, lineHeight: 1, letterSpacing: '0.02em', ...gold, filter: 'drop-shadow(0 6px 40px rgba(212,175,55,0.45))' }}>
          The Sorting Hat
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.6, duration: 1.4 }}
          style={{ fontFamily: t.display, fontSize: 'clamp(15px, 1.3vw, 20px)', fontWeight: 600, letterSpacing: '0.32em', textTransform: 'uppercase', color: t.ink }}>
          AI Auto-Reply &amp; AI Actions
        </motion.div>
      </div>

      {!started && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.75, 0.35, 0.75] }} transition={{ delay: 4.5, duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: '3vh', textAlign: 'center', fontFamily: t.serif, fontStyle: 'italic', fontSize: 16, color: t.muted, pointerEvents: 'none' }}>
          Click to begin
        </motion.div>
      )}
    </div>
  )
}

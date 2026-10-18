import { useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Paperclip, UserRound, MessageSquareQuote, Send } from 'lucide-react'
import { hall as t } from '../theme'
import { SPELLS } from '../spells'
import { SpellFx } from './SpellFx'
import { CardLight } from './CardLight'

const ease = [0.22, 1, 0.36, 1]

// Patronus light: silver-blue glass, like the charm itself
const PAT = { light: '0 0 6px rgba(150,195,255,0.95), 0 0 16px rgba(120,170,255,0.55), 0 0 32px rgba(110,160,255,0.3)', ink: '#f2f7ff', muted: '#cfdcf3', label: '#b3cbf2', icon: '#cfe0ff', edge: 'rgba(170,200,255,0.45)', glow: 'rgba(140,180,255,0.32)' }

// Snape's lesson: six buttons cast the six auto-reply themes.
export function SpellBook({ cast, onCast }) {
  const cardRef = useRef()
  const active = cast?.i ?? null
  const s = active === null ? null : SPELLS[active]
  return (
    <>
      <SpellFx cast={cast} />
      <CardLight cast={cast} cardRef={cardRef} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.7, ease }}
        style={{ position: 'fixed', top: '6vh', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none' }}>
        <div style={{ fontFamily: t.display, fontSize: 13, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: t.gold }}>Auto-reply</div>
        <div style={{ fontFamily: t.display, fontSize: 'clamp(28px, 2.8vw, 44px)', fontWeight: 700, color: t.ink }}>Six reply themes. Nothing else.</div>
      </motion.div>

      {/* the card the spell lands on */}
      <div style={{ position: 'fixed', right: '5vw', top: '50%', translate: '0 -50%', width: 'min(440px, 32vw)', pointerEvents: 'none' }}>
        <AnimatePresence mode="wait">
          {s && (
            <motion.div ref={cardRef} key={s.code} initial={{ opacity: 0, scale: 0.985, filter: 'blur(6px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.25 } }} // leave at once; only the entrance waits for the light
              transition={{ delay: 2.75, duration: 0.9, ease }} // the glyphs light up as the dust settles on them
              style={{ /* no panel: the outline is Patronus light (CardLight); a faint veil keeps the glow legible */ padding: '22px 24px', borderRadius: 14, background: 'radial-gradient(ellipse at 50% 50%, rgba(8,12,26,0.45), rgba(8,12,26,0) 75%)', textShadow: `0 0 6px ${s.color}f2, 0 0 16px ${s.color}8c, 0 0 32px ${s.color}4d`, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontFamily: t.mono, fontSize: 13, fontWeight: 600, color: s.color }}>{s.code}</span>
                <span style={{ fontFamily: t.display, fontSize: 26, fontWeight: 700, color: PAT.ink, lineHeight: 1.15 }}>{s.theme}</span>
                <span style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 17, color: PAT.label }}>{s.spell}</span>
              </div>
              <Line Icon={MessageSquareQuote} label="Customer asks" tone={s.color}>{s.ask}</Line>
              <Line Icon={Send} label="AI replies with" tone={s.color}>
                {s.sends}
                {s.chip && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 10, padding: '2px 9px', borderRadius: 6, fontFamily: t.mono, fontSize: 12, color: PAT.ink, background: 'rgba(170,200,255,0.12)', border: `1px solid ${PAT.edge}`, verticalAlign: 'middle' }}>
                    <Paperclip size={12} /> {s.chip}
                  </span>
                )}
              </Line>
              <Line Icon={UserRound} label="Goes to a human if" tone={s.color} muted>{s.human}</Line>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* the spell dock */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '4.5vh', display: 'flex', justifyContent: 'center', gap: 10, padding: '0 24px' }}>
        {SPELLS.map((sp, i) => {
          const on = i === active
          return (
            <motion.button key={sp.code} onClick={() => onCast(i)}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.06, duration: 0.5, ease }}
              whileHover={{ y: -3 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, padding: '10px 16px 9px', minWidth: 150, borderRadius: 10, textAlign: 'left',
                background: on ? `${sp.color}26` : 'rgba(10,12,24,0.78)', border: `1px solid ${on ? sp.color : t.line}`, boxShadow: on ? `0 0 24px ${sp.color}44` : 'none', backdropFilter: 'blur(6px)' }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: t.mono, fontSize: 11, color: sp.color }}>{sp.code}</span>
                <span style={{ fontFamily: t.display, fontSize: 14, fontWeight: 700, color: t.ink, whiteSpace: 'nowrap' }}>{sp.short}</span>
              </span>
              <span style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 14, color: t.muted, whiteSpace: 'nowrap' }}>{sp.spell}</span>
            </motion.button>
          )
        })}
      </div>
    </>
  )
}

function Line({ Icon, label, children, tone, muted }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <Icon size={17} color={tone ?? PAT.icon} style={{ flexShrink: 0, marginTop: 3, opacity: muted ? 0.7 : 1, filter: `drop-shadow(0 0 6px ${PAT.glow})` }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: t.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: tone ?? PAT.label, opacity: 0.85 }}>{label}</span>
        <span style={{ fontFamily: t.serif, fontSize: 19, lineHeight: 1.35, color: muted ? PAT.muted : PAT.ink }}>{children}</span>
      </div>
    </div>
  )
}

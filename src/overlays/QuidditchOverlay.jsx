import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, UserRound, RotateCcw } from 'lucide-react'
import { hall as t } from '../theme'
import { CHECKS, hoopScreen } from '../three/Quidditch'
import { hand } from './Scroll'

const ease = [0.22, 1, 0.36, 1]
const ROMAN = ['I', 'II', 'III', 'IV', 'V']

// One label per hoop, pinned each frame to the hoop's projected screen position.
function HoopLabels({ hoops }) {
  const refs = useRef([])
  useEffect(() => {
    let raf
    const tick = () => {
      refs.current.forEach((el, i) => { if (el) el.style.transform = `translate(${hoopScreen[i].x - 110}px, ${hoopScreen[i].y}px) translateY(-100%)` })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return CHECKS.map(({ check, note, fail }, i) => {
    const st = hoops[i]
    const tone = st === 'pass' ? t.goldBright : st === 'fail' || st === 'off' ? '#ff6b5e' : t.muted
    return (
      <div key={i} ref={(el) => (refs.current[i] = el)} style={{ position: 'fixed', left: 0, top: 0, width: 220, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontFamily: t.display, fontSize: 14, fontWeight: 700, letterSpacing: '0.24em', color: tone, transition: 'color .4s' }}>{ROMAN[i]}</div>
        <div style={{ fontFamily: t.display, fontSize: 'clamp(14px, 1.15vw, 19px)', fontWeight: 600, lineHeight: 1.2, color: st === 'pending' ? t.muted : t.ink, textShadow: '0 2px 12px rgba(0,0,0,0.9)', transition: 'color .4s' }}>{check}</div>
        {note && <div style={{ marginTop: 3, fontFamily: hand, fontStyle: 'italic', fontSize: 'clamp(12px, 0.95vw, 15px)', lineHeight: 1.25, color: t.muted }}>{note}</div>}
        <div style={{ marginTop: 4, height: 18, fontFamily: t.mono, fontSize: 12, color: '#ff6b5e', opacity: st === 'fail' ? 1 : st === 'off' ? 0.55 : 0, transition: 'opacity .4s' }}>✕ {fail}</div>
      </div>
    )
  })
}

// result: null while flying | { ok: true } | { ok: false, at: i }
export function QuidditchOverlay({ result, hoops, off, onToggle, onFly }) {
  return (
    <>
      <HoopLabels hoops={hoops} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7, ease }}
        style={{ position: 'fixed', top: '6vh', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, pointerEvents: 'none', textAlign: 'center' }}>
        <div style={{ fontFamily: t.display, fontSize: 13, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: t.gold }}>Auto-reply</div>
        <div style={{ fontFamily: t.display, fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 700, color: t.ink }}>All checks pass, or nothing is sent</div>
        <div style={{ fontFamily: hand, fontStyle: 'italic', fontSize: 'clamp(17px, 1.4vw, 22px)', color: t.goldBright, opacity: 0.85 }}>The email must clear every hoop. Miss one, and the Hat holds its tongue.</div>
      </motion.div>

      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 'calc(3vh + 84px)', display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={result.ok ? 'ok' : 'fail'} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ delay: result.ok ? 0.5 : 0.9, duration: 0.6, ease }}
              style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px', borderRadius: 12, background: 'rgba(10,12,24,0.85)', border: `1px solid ${result.ok ? '#ffd27a88' : '#ff6b5e88'}`, boxShadow: `0 0 50px ${result.ok ? '#ffd27a33' : '#ff4a3d33'}`, backdropFilter: 'blur(8px)' }}>
              {result.ok ? <Send size={22} color="#ffd27a" /> : <UserRound size={22} color="#ff6b5e" />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: t.display, fontSize: 22, fontWeight: 700, color: t.ink }}>
                  {result.ok ? 'One reply, covering every theme' : `Failed at ${ROMAN[result.at]}: nothing sent, it goes to a human`}
                </span>
                <span style={{ fontFamily: t.mono, fontSize: 13, color: result.ok ? '#ffd27a' : '#ff6b5e' }}>
                  {result.ok ? 'SENT' : CHECKS[result.at].fail}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Controls off={off} onToggle={onToggle} onFly={onFly} />
    </>
  )
}

// The demo controls: switch any check off and the email re-flies.
function Controls({ off, onToggle, onFly }) {
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, bottom: '3vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', borderRadius: 14, background: 'rgba(10,12,24,0.85)', border: `1px solid ${t.line}`, backdropFilter: 'blur(8px)' }}>
        <span style={{ fontFamily: t.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', color: t.gold, padding: '0 10px 0 6px' }}>CHECKS</span>
        {CHECKS.map(({ check, short }, i) => {
          const on = !off[i]
          return (
            <button key={i} onClick={() => onToggle(i)} title={`${on ? 'Switch off' : 'Switch on'}: ${check}`}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 12px', borderRadius: 10, background: on ? 'rgba(255,210,122,0.08)' : 'rgba(255,74,61,0.12)', border: `1px solid ${on ? 'rgba(255,210,122,0.3)' : 'rgba(255,107,94,0.55)'}`, transition: 'all .25s' }}>
              <span style={{ width: 30, height: 17, borderRadius: 999, padding: 2, background: on ? '#c9a24a' : '#5a1410', display: 'flex', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'all .25s' }}>
                <span style={{ width: 13, height: 13, borderRadius: '50%', background: on ? '#fff3c4' : '#ff6b5e' }} />
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
                <span style={{ fontFamily: t.display, fontSize: 10, fontWeight: 700, letterSpacing: '0.2em', color: on ? t.gold : '#ff6b5e' }}>{ROMAN[i]}</span>
                <span style={{ fontFamily: t.serif, fontSize: 15, color: on ? t.ink : t.muted, whiteSpace: 'nowrap', textDecoration: on ? 'none' : 'line-through' }}>{short ?? check}</span>
              </span>
            </button>
          )
        })}
        <button onClick={onFly} title="Fly again (R)"
          style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 6, padding: '10px 14px', borderRadius: 10, background: t.wax, color: t.parchment, fontFamily: t.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.16em' }}>
          <RotateCcw size={14} /> FLY
        </button>
      </div>
    </div>
  )
}

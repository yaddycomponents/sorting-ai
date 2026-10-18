import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Feather, Send, Landmark, UserRound, Check, RotateCcw, ScrollText } from 'lucide-react'
import { hall as t, houses } from '../theme'
import { presets } from '../classify'

const ease = [0.22, 1, 0.36, 1]

const MAILBOX = { ar: 'ar@growfin.ai', collector: 'yathavan@growfin.ai' }

export function Live({ sort, doors, setDoors, onSend, onReset }) {
  const [to, setTo] = useState('collector')
  const [body, setBody] = useState('')
  const busy = sort.phase === 'flying' || sort.phase === 'thinking'

  const send = () => {
    if (!body.trim() || busy) return
    onSend({ to, body })
  }

  return (
    <>
      <Doors doors={doors} setDoors={setDoors} />

      {/* the owl letter */}
      {/* the letter slides away once sent: the 3D owl-post story takes the stage */}
      <motion.div initial={{ opacity: 0, x: -30 }} animate={sort.phase === 'idle' ? { opacity: 1, x: 0 } : { opacity: 0, x: -460 }} transition={{ duration: 0.6, ease }}
        style={{ position: 'fixed', left: 32, top: '50%', translate: '0 -50%', width: 'min(400px, 30vw)', zIndex: 2 }}>
        <div style={{ ...parchment, padding: '22px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: t.display, fontSize: 13, fontWeight: 700, letterSpacing: '0.28em', textTransform: 'uppercase', color: t.parchmentMuted }}>
            <Feather size={16} /> Owl post
          </div>

          <Row label="From"><span style={{ fontFamily: t.mono, fontSize: 13 }}>accounts@acme-corp.com</span></Row>
          <Row label="To">
            <div style={{ display: 'flex', gap: 6 }}>
              <Pick on={to === 'ar'} onClick={() => setTo('ar')} Icon={Landmark}>AR mailbox</Pick>
              <Pick on={to === 'collector'} onClick={() => setTo('collector')} Icon={UserRound}>Collector</Pick>
            </div>
          </Row>
          <div style={{ fontFamily: t.mono, fontSize: 11.5, color: t.parchmentMuted, margin: '-2px 0 10px 52px' }}>{MAILBOX[to]}</div>

          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send() } }}
            placeholder="Write as the customer…"
            style={{ width: '100%', resize: 'none', border: `1px solid ${t.parchmentMuted}55`, borderRadius: 6, background: 'rgba(255,255,255,0.35)', padding: '12px 14px', fontFamily: t.serif, fontSize: 20, lineHeight: 1.35, color: t.parchmentInk, outline: 'none' }} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {presets.map((p) => (
              <button key={p.label} onClick={() => { setTo(p.to); setBody(p.body) }}
                style={{ fontFamily: t.display, fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', padding: '5px 10px', borderRadius: 999, border: `1px solid ${t.parchmentMuted}66`, color: t.parchmentMuted }}>
                {p.label}
              </button>
            ))}
          </div>

          <button onClick={send} disabled={busy || !body.trim()}
            style={{ marginTop: 16, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 0', borderRadius: 8, background: busy || !body.trim() ? '#8b7a5c' : t.wax, color: t.parchment, fontFamily: t.display, fontSize: 15, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', boxShadow: '0 6px 18px rgba(80,10,10,0.35)' }}>
            <Send size={16} /> Send the owl
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 11, opacity: 0.7, letterSpacing: 0, textTransform: 'none' }}>⌘ Enter</span>
          </button>
        </div>
      </motion.div>

      {/* the Hat's voice */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '6vh', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {sort.phase === 'thinking' && (
            <motion.div key="think" initial={{ opacity: 0 }} animate={{ opacity: [0.4, 1, 0.4], transition: { duration: 1.4, repeat: Infinity } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
              style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 28, color: t.muted }}>
              Hmm… let me see…
            </motion.div>
          )}
          {sort.phase === 'decided' && (
            <motion.div key={`say${sort.key}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease }}
              style={{ fontFamily: t.serif, fontStyle: 'italic', fontSize: 'clamp(24px, 2.3vw, 36px)', color: t.goldBright, textAlign: 'center', maxWidth: '36ch', textShadow: '0 4px 24px rgba(0,0,0,0.9)' }}>
              <Typed text={`“${sort.res.hatSays}”`} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {sort.phase === 'decided' && <Verdict key={sort.key} res={sort.res} onReset={onReset} />}
      </AnimatePresence>
    </>
  )
}

function Verdict({ res, onReset }) {
  const h = houses[res.house]
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ delay: 0.9, duration: 0.7, ease }}
      style={{ position: 'fixed', right: 32, top: '50%', translate: '0 -50%', width: 'min(400px, 30vw)', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* headline: what the Hat did + the real status; house name stays quiet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '18px 22px', borderRadius: 12, background: 'rgba(10,12,24,0.85)', border: `1px solid ${h.glow}66`, boxShadow: `0 0 50px ${h.glow}33`, backdropFilter: 'blur(8px)' }}>
        <img src={h.crest} alt="" style={{ width: 84, height: 'auto', flexShrink: 0, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: t.display, fontSize: 11, fontWeight: 600, letterSpacing: '0.3em', textTransform: 'uppercase', color: h.glow, opacity: 0.7 }}>{h.name}</span>
          <span style={{ fontFamily: t.display, fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: t.ink }}>{h.does}</span>
          <span style={{ alignSelf: 'flex-start', fontFamily: t.mono, fontSize: 13, fontWeight: 600, padding: '4px 10px', borderRadius: 6, background: `${h.glow}22`, border: `1px solid ${h.glow}88`, color: t.ink }}>{res.status}</span>
        </div>
      </div>

      {res.actions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {res.actions.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 + i * 0.2 }}
              style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(10,12,24,0.82)', borderLeft: `3px solid ${a.skipped ? '#7d7a70' : h.glow}` }}>
              <div style={{ fontFamily: t.display, fontSize: 14, fontWeight: 700, letterSpacing: '0.04em', color: a.skipped ? t.muted : t.ink }}>
                {a.type === 'PROMISE_TO_PAY' ? 'Promise to pay' : 'Dispute'} · {a.scope === 'account' ? 'account level' : a.scope}
                {a.id && <span style={{ fontFamily: t.mono, fontWeight: 400, fontSize: 12, color: t.faint }}>  #{a.id}</span>}
              </div>
              <div style={{ fontFamily: t.serif, fontSize: 17, color: t.muted }}>
                {a.skipped ? `Skipped: ${a.skipped}` : [a.amount, a.date].filter(Boolean).join(' · ') || 'created'}
                {!a.skipped && <span style={{ color: t.faint }}> · by AI Assistant</span>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {res.reply && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6 }}
          style={{ ...parchment, padding: '12px 16px', fontFamily: t.serif, fontSize: 17, lineHeight: 1.35 }}>
          <div style={{ fontFamily: t.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: t.parchmentMuted, marginBottom: 4 }}>REPLY · FROM AR MAILBOX · AI ASSISTANT</div>
          {res.reply}
        </motion.div>
      )}

      {/* the Marauder's Map */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.9 }}
        style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 8, border: `1px dashed ${t.line}` }}>
        <ScrollText size={16} color={t.gold} style={{ flexShrink: 0, marginTop: 2 }} />
        <span style={{ fontFamily: t.mono, fontSize: 12, lineHeight: 1.5, color: t.muted }}>{res.reason}</span>
      </motion.div>

      <button onClick={onReset} style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 8, fontFamily: t.display, fontSize: 12, letterSpacing: '0.2em', textTransform: 'uppercase', color: t.muted, padding: '6px 4px' }}>
        <RotateCcw size={14} /> Sort another
      </button>
    </motion.div>
  )
}

// AI Controls: which doors the owls may come through.
function Doors({ doors, setDoors }) {
  const flip = (k) => setDoors((d) => {
    const next = { ...d, [k]: !d[k] }
    return next.ar || next.users ? next : d // at least one door stays open
  })
  return (
    <div style={{ position: 'fixed', top: 24, right: 32, zIndex: 3, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 16px', borderRadius: 10, background: 'rgba(10,12,24,0.75)', border: `1px solid ${t.line}`, backdropFilter: 'blur(8px)' }}>
      <span style={{ fontFamily: t.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.24em', color: t.gold }}>AI CONTROLS</span>
      {[['ar', 'AR mailbox'], ['users', 'Growfin users']].map(([k, label]) => (
        <button key={k} onClick={() => flip(k)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: t.serif, fontSize: 17, color: doors[k] ? t.ink : t.faint }}>
          <span style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${t.gold}`, background: doors[k] ? t.gold : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {doors[k] && <Check size={13} color={t.night} strokeWidth={3} />}
          </span>
          {label}
        </button>
      ))}
    </div>
  )
}

function Row({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '12px 0 8px' }}>
      <span style={{ width: 40, fontFamily: t.display, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.parchmentMuted }}>{label}</span>
      {children}
    </div>
  )
}

function Pick({ on, onClick, Icon, children }) {
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 999, fontFamily: t.display, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', border: `1px solid ${on ? t.parchmentInk : t.parchmentMuted + '66'}`, background: on ? t.parchmentInk : 'transparent', color: on ? t.parchment : t.parchmentMuted }}>
      <Icon size={13} /> {children}
    </button>
  )
}

function Typed({ text }) {
  return Array.from(text).map((c, i) => (
    <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.028, duration: 0.05 }}>{c}</motion.span>
  ))
}

const parchment = {
  borderRadius: 8,
  background: `radial-gradient(ellipse at 30% 15%, ${t.parchment}, ${t.parchmentDeep} 130%)`,
  color: t.parchmentInk,
  boxShadow: '0 20px 60px rgba(0,0,0,0.55), inset 0 0 40px rgba(122,100,72,0.3)',
}

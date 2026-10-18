import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mail, WandSparkles } from 'lucide-react'
import { hall as t } from '../theme'
import { GATES, LAUNCH, fx } from '../three/Gates'
import { useFluid, pour } from './fluid'
import { hand } from './Scroll'

const ease = [0.22, 1, 0.36, 1]

const tone = { pass: t.goldBright, fail: '#3fe08a', silent: '#9a968c', pending: t.faint, off: t.faint }

// A floating plaque over each gatehouse roof, pinned every frame to its projected
// position; nearer gates read larger. It lights gold when passed, green when it
// turns the owl away, grey on a silent stop.
function GateLabels({ states }) {
  const refs = useRef([])
  useEffect(() => {
    let raf
    const tick = () => {
      refs.current.forEach((el, i) => {
        if (!el) return
        const l = fx.labels[i]
        el.style.transform = `translate(${l.x}px, ${l.y}px) translate(-50%, -100%) scale(${1.05 - l.z * 0.35})`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return GATES.map((g, i) => {
    const st = states[i]
    const c = tone[st]
    const lit = st !== 'pending'
    return (
      <div key={i} ref={(el) => (refs.current[i] = el)}
        style={{ position: 'fixed', left: 0, top: 0, zIndex: 1, pointerEvents: 'none', transformOrigin: '50% 100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 8, whiteSpace: 'nowrap',
          background: lit ? 'rgba(8,10,20,0.88)' : 'rgba(8,10,20,0.62)', border: `1px solid ${lit ? c : 'rgba(255,255,255,0.14)'}`,
          boxShadow: lit && st !== 'silent' ? `0 0 18px ${c}55` : 'none', transition: 'all .35s' }}>
          <span style={{ fontFamily: t.display, fontSize: 13, fontWeight: 700, color: lit ? c : t.muted }}>{i + 1}</span>
          <span style={{ fontFamily: t.display, fontSize: 13, fontWeight: 600, color: lit ? t.ink : t.muted }}>{g.name}</span>
        </div>
        <div style={{ height: 14, fontFamily: t.mono, fontSize: 11, color: c, opacity: st === 'fail' ? 1 : 0, transition: 'opacity .35s' }}>{g.code}</div>
        <div style={{ width: 1, height: 10, background: lit ? c : 'rgba(255,255,255,0.2)' }} />
      </div>
    )
  })
}

// The duel, in fluid ink: Ron's broken wand sputters green toward the gate that
// stopped the owl; Snape answers with a clean silver stream. On success, Ron
// sends gold to the Hat and Snape follows.
function GatesFx({ run, result, snapeCast, expecto }) {
  const { box, fluid } = useFluid()
  const resultKey = result ? (result.ok ? 'ok' : result.at) : null
  const target = () => (result?.ok ? fx.hat : fx.gates[result.at])

  // on click: Ron's spell flies from his wand to the letter, which then takes off
  useEffect(() => {
    if (!run || run.idle || !fluid.current || !fx.ron.ok) return
    return pour(fluid.current, { from: { ...fx.ron }, to: { ...fx.letter }, color: '#ffd27a', dur: LAUNCH * 800, lift: 0.08 })
  }, [run?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!result || !fluid.current || !fx.ron.ok) return
    const to = { ...target() }
    return pour(fluid.current, result.ok
      ? { from: { ...fx.ron }, to, color: '#ffd27a', dur: 900, lift: 0.18 }
      : { from: { ...fx.ron }, to, color: '#3fe08a', dur: 900, lift: 0.12, fizzle: true })
  }, [resultKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!snapeCast || !result || !fluid.current || !fx.snape.ok) return
    return pour(fluid.current, { from: { ...fx.snape }, to: { ...target() }, color: result.ok ? '#ffd27a' : '#c9d4ff', delay: 180, dur: 700, lift: 0.16 })
  }, [snapeCast?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  // Expecto Patronum: a bright silver stream from Snape's wand to where the Patronus erupts
  useEffect(() => {
    if (!expecto || !fluid.current || !fx.snape.ok || !result || result.ok) return
    return pour(fluid.current, { from: { ...fx.snape }, to: { ...fx.patronus }, color: '#e6efff', dur: 900, lift: 0.1 })
  }, [expecto?.key]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}

// result: null | { ok: true } | { ok: false, at }
export function GatesOverlay({ run, states, result, snapeCast, expecto, active, onPick }) {
  const g = result && !result.ok ? GATES[result.at] : null
  return (
    <>
      <GatesFx run={run} result={result} snapeCast={snapeCast} expecto={expecto} />
      {/* a dark band under the title and gate chips, so text never fights the scene */}
      <div style={{ position: 'fixed', left: 0, right: 0, top: 0, height: '30vh', background: 'linear-gradient(180deg, rgba(5,7,14,0.9) 0%, rgba(5,7,14,0.6) 55%, transparent 100%)', pointerEvents: 'none' }} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.7, ease }}
        style={{ position: 'fixed', top: '5vh', left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none', textAlign: 'center' }}>
        <div style={{ fontFamily: t.display, fontSize: 13, fontWeight: 600, letterSpacing: '0.42em', textTransform: 'uppercase', color: t.gold }}>Before the Hat</div>
        <div style={{ fontFamily: t.display, fontSize: 'clamp(28px, 3vw, 48px)', fontWeight: 700, color: t.ink }}>The castle gates</div>
        <div style={{ fontFamily: hand, fontStyle: 'italic', fontSize: 'clamp(16px, 1.35vw, 21px)', color: t.goldBright, opacity: 0.85 }}>The gates are free; the Hat costs galleons. Most owls never reach it.</div>
      </motion.div>

      <GateLabels states={states} />

      <div style={{ position: 'fixed', right: '4vw', bottom: 'calc(3vh + 72px)', display: 'flex', pointerEvents: 'none', zIndex: 2 }}>
        <AnimatePresence mode="wait">
          {result && (
            <motion.div key={result.ok ? 'ok' : `f${result.at}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.5, duration: 0.5, ease }}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 22px', borderRadius: 12, background: 'rgba(10,12,24,0.88)', border: `1px solid ${result.ok ? '#ffd27a88' : g.silent ? '#9a968c88' : '#3fe08a88'}`, backdropFilter: 'blur(8px)' }}>
              {result.ok ? <WandSparkles size={22} color="#ffd27a" /> : <Mail size={22} color={g.silent ? '#9a968c' : '#3fe08a'} />}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: t.display, fontSize: 20, fontWeight: 700, color: t.ink }}>
                  {result.ok ? 'Through every gate: the Hat wakes' : g.silent ? `Stopped at ${result.at + 1}: ignored silently` : `Turned away at ${result.at + 1}`}
                </span>
                <span style={{ fontFamily: t.mono, fontSize: 13, color: result.ok ? '#ffd27a' : g.silent ? '#9a968c' : '#3fe08a' }}>
                  {result.ok ? 'one LLM call · ~$0.019' : g.silent ? 'no decision recorded · $0' : `${g.code} · $0`}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* scenario picker: what kind of email arrives? */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: '3vh', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 10px', borderRadius: 14, background: 'rgba(10,12,24,0.85)', border: `1px solid ${t.line}`, backdropFilter: 'blur(8px)' }}>
          <Pick label="Real email" k={0} on={active === null} gold onClick={() => onPick(null)} />
          {GATES.map((gt, i) => <Pick key={i} label={gt.scenario} k={i + 1} on={active === i} onClick={() => onPick(i)} />)}
        </div>
      </div>
    </>
  )
}

function Pick({ label, k, on, gold, onClick }) {
  const c = gold ? '#ffd27a' : '#3fe08a'
  return (
    <button onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderRadius: 8, background: on ? `${c}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${on ? c : t.line}`, transition: 'all .2s' }}>
      <span style={{ fontFamily: t.mono, fontSize: 11, color: on ? c : t.faint }}>{k}</span>
      <span style={{ fontFamily: t.serif, fontSize: 14, color: on ? t.ink : t.muted, whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}

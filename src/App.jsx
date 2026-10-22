import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import World from './three/World'
import { wasPoked } from './three/Interactive'
import { Avada, DEAD_AFTER, HIT as AVADA_HIT } from './overlays/Avada'
import { classify } from './classify'
import { Title, Fin } from './overlays/Captions'
import { Pipeline, Houses, Doors } from './overlays/Slides'
import { GatesOverlay } from './overlays/GatesOverlay'
import { QuidditchOverlay } from './overlays/QuidditchOverlay'
import { GATES } from './three/Gates'
import { SpellBook } from './overlays/SpellBook'
import { SPELLS } from './spells'
import { Live } from './overlays/Live'
import { say, thinking, hush, toggleMute, onLine, playSfx } from './voice'
import { playTheme, stopTheme, themePlaying, themeStarting } from './music'
import { Intro } from './overlays/Intro'

// Plain slides first, then the 3D: the Hat appears, sorts live, and bows out.
const SCENES = ['intro', 'pipeline', 'gates', 'houses', 'snape', 'quidditch', 'doors', 'title', 'live', 'fin']

// What the Hat says when a scene opens.
const SCENE_VOICE = {
  pipeline: 'slide-pipeline', gates: 'ron-intro', houses: 'slide-outcomes', snape: 'snape-intro', quidditch: 'slide-checks',
  title: 'intro', fin: 'fin',
}

// Timeline of one live sorting (ms).
const FLY = 3400 // Hedwig carries the letter and drops it in the Hat (three/LiveStage OWL_IN)
const THINK = 3200

export default function App() {
  const [at, setAt] = useState(() => Math.max(0, SCENES.indexOf(new URLSearchParams(window.location.search).get('s'))))
  const [doors, setDoors] = useState({ ar: true, users: true })
  const [sort, setSort] = useState({ phase: 'idle', res: null, key: 0 })
  // The Quidditch run: which checks are switched off decides where the email fails.
  const [off, setOff] = useState([false, false, false, false, false])
  const [run, setRun] = useState({ key: 0, off })
  const [result, setResult] = useState(null)
  const [hoops, setHoops] = useState(['pending', 'pending', 'pending', 'pending', 'pending'])
  const flyRun = useCallback((offs) => {
    setResult(null)
    setHoops(offs.map((o) => (o ? 'off' : 'pending')))
    setRun({ key: Date.now(), off: offs })
  }, [])
  const toggleCheck = useCallback((i) => {
    setOff((o) => {
      const next = o.map((x, j) => (j === i ? !x : x))
      flyRun(next)
      return next
    })
  }, [flyRun])
  const offRef = useRef(off)
  offRef.current = off
  // The castle gates: a scenario decides which gate (if any) stops the owl.
  // Ron's line and Snape's retort play when it's stopped (public/voice/ron-g1… / snape-g1…).
  const idleGates = ['pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending', 'pending']
  const [gateRun, setGateRun] = useState({ key: 0, stopAt: null, idle: true })
  const [gateStates, setGateStates] = useState(idleGates)
  const [gateResult, setGateResult] = useState(null)
  // Snape answers Ron: he casts when his line starts (or after a beat, if muted).
  const [snapeCast, setSnapeCast] = useState(null)
  const [expecto, setExpecto] = useState(null)
  const snapeTimer = useRef()
  const snapeAnswers = useCallback(() => {
    clearTimeout(snapeTimer.current)
    snapeTimer.current = setTimeout(() => setSnapeCast({ key: Date.now(), color: '#c9d4ff' }), 7500) // only if his line never plays (muted); longer than Ron's longest line
  }, [])
  useEffect(() => onLine((name) => {
    if (name === 'expecto') { setExpecto({ key: Date.now() }); return } // the Patronus answers the incantation
    if (!/^snape-(g\d|ok)/.test(name)) return
    clearTimeout(snapeTimer.current)
    setSnapeCast({ key: Date.now(), color: '#c9d4ff' })
  }), [])
  const pickGate = useCallback((stopAt) => {
    hush()
    setExpecto(null)
    clearTimeout(snapeTimer.current)
    setGateResult(null)
    setGateStates(idleGates)
    setGateRun({ key: Date.now(), stopAt })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const gate = useMemo(() => ({
    run: gateRun,
    states: gateStates,
    awake: gateResult?.ok ?? false,
    onPass: (i) => setGateStates((g) => g.map((x, j) => (j === i ? 'pass' : x))),
    onStop: (i) => {
      setGateStates((g) => g.map((x, j) => (j === i ? (GATES[i].silent ? 'silent' : 'fail') : x)))
      setGateResult({ ok: false, at: i })
      // turned away (not silent): the Dementors come, so Snape ends with Expecto Patronum
      if (GATES[i].silent) say(`ron-g${i + 1}`, `snape-g${i + 1}`)
      else say(`ron-g${i + 1}`, `snape-g${i + 1}`, 'expecto')
      snapeAnswers()
    },
    onDone: () => { setGateResult({ ok: true }); say('ron-ok', 'snape-ok'); snapeAnswers() },
    snapeCast,
    // a turn-away brings the Dementors; Snape's answer is Expecto Patronum
    expecto: gateResult && !gateResult.ok && !GATES[gateResult.at].silent ? expecto : null,
  }), [gateRun, gateStates, gateResult, snapeCast, snapeAnswers, expecto])

  const quid = useMemo(() => ({
    run,
    states: hoops,
    onPass: (i) => setHoops((h) => h.map((x, j) => (j === i ? 'pass' : x))),
    onFail: (at) => { setHoops((h) => h.map((x, j) => (j === at ? 'fail' : x))); setResult({ ok: false, at }) },
    onDone: () => setResult({ ok: true }),
  }), [run, hoops])
  const [cast, setCast] = useState(null) // { i, key, color } — Snape's last spell
  const timers = useRef([])

  // Easter egg: five clicks on Snape within 5 s and he casts Avada Kedavra.
  const [dead, setDead] = useState(false)
  const deadRef = useRef(false)
  deadRef.current = dead
  const snapePokes = useRef([])
  const deadAt = useRef(0)
  const pokeSnape = useCallback(() => {
    const now = performance.now()
    snapePokes.current = [...snapePokes.current.filter((x) => now - x < 5000), now]
    if (snapePokes.current.length < 5) return
    snapePokes.current = []
    hush()
    stopTheme()
    // Snape's incantation, then the curse's burst (cut from LockChime) as the flash lands
    playSfx('avada', 1)
    setTimeout(() => playSfx('avada-hit', 1), AVADA_HIT * 1000)
    deadAt.current = performance.now()
    setDead(true)
  }, [])
  const revive = useCallback(() => { if (performance.now() - deadAt.current > DEAD_AFTER) setDead(false) }, [])

  const scene = SCENES[at]

  const sceneRef = useRef(scene)
  sceneRef.current = scene

  const castSpell = useCallback((i) => {
    setCast({ i, key: Date.now(), color: SPELLS[i].color, code: SPELLS[i].code })
    say(`snape-${SPELLS[i].code.toLowerCase()}`) // public/voice/snape-t1.mp3 …
  }, [])

  // On the intro, a click/key starts the music instead of advancing (browsers block
  // audio before a gesture). If the music isn't playing, the click retries it, but
  // after two tries the deck moves on regardless, so it can never get stuck.
  const [started, setStarted] = useState(false)
  const tries = useRef(0)
  const begin = useCallback(() => {
    if (themeStarting()) return true // still loading: hold the intro, don't skip past the music
    if (themePlaying() || tries.current >= 2) return false
    tries.current++
    setStarted(true)
    playTheme()
    return true
  }, [])

  useEffect(() => {
    if (scene !== 'intro') stopTheme()
    else tries.current = 0 // coming back to the intro: the music can be started again
    if (scene !== 'snape') setCast(null)
    if (scene === 'quidditch') flyRun(offRef.current)
    if (scene === 'gates') { setGateRun({ key: Date.now(), stopAt: null, idle: true }); setGateStates(idleGates); setGateResult(null) }
    if (SCENE_VOICE[scene]) say(SCENE_VOICE[scene])
    else hush()
  }, [scene, flyRun])

  const go = useCallback((d) => setAt((s) => Math.min(SCENES.length - 1, Math.max(0, s + d))), [])

  useEffect(() => {
    const onKey = (e) => {
      if (deadRef.current) { e.preventDefault(); revive(); return } // revive from the curse
      if (e.target.closest?.('textarea, input, [contenteditable]')) {
        if (e.key === 'Escape') e.target.blur()
        return
      }
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault()
        if (sceneRef.current === 'intro' && begin()) return
        go(1)
      }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); go(-1) }
      if (e.key === 'm' || e.key === 'M') toggleMute()
      if (sceneRef.current === 'snape' && e.key >= '1' && e.key <= '6') castSpell(Number(e.key) - 1)
      if (sceneRef.current === 'quidditch' && e.key >= '1' && e.key <= '5') toggleCheck(Number(e.key) - 1)
      if (sceneRef.current === 'gates' && e.key >= '0' && e.key <= '9') pickGate(e.key === '0' ? null : Number(e.key) - 1)
      if (sceneRef.current === 'quidditch' && (e.key === 'r' || e.key === 'R')) flyRun(offRef.current)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, castSpell, begin, flyRun, toggleCheck, pickGate, revive])

  const send = useCallback((email) => {
    timers.current.forEach(clearTimeout)
    const res = classify(email, doors)
    hush()
    setSort({ phase: 'flying', res, key: Date.now() })
    timers.current = [
      setTimeout(() => { setSort((s) => ({ ...s, phase: 'thinking' })); thinking() }, FLY),
      setTimeout(() => { setSort((s) => ({ ...s, phase: 'decided' })); say(res.voice) }, FLY + THINK),
    ]
  }, [doors])

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout)
    hush()
    setSort({ phase: 'idle', res: null, key: 0 })
  }, [])

  return (
    <div onClick={(e) => {
      if (wasPoked()) return // a click on a 3D model, not on the slide
      if (scene === 'intro' && begin()) return
      if (scene !== 'live' && !e.target.closest('button')) go(e.shiftKey ? -1 : 1)
    }}
      style={{ position: 'fixed', inset: 0, cursor: scene === 'live' ? 'default' : 'pointer' }}>
      <World scene={scene} sort={sort} cast={cast} quid={quid} gate={gate} onSnapePoke={pokeSnape} />
      {scene === 'title' && <Title />}
      {scene === 'intro' && <Intro started={started} />}
      {scene === 'pipeline' && <Pipeline />}
      {scene === 'gates' && <GatesOverlay run={gateRun} states={gateStates} result={gateResult} snapeCast={snapeCast} expecto={expecto} active={gateRun.idle ? undefined : gateRun.stopAt} onPick={pickGate} />}
      {scene === 'houses' && <Houses />}
      {scene === 'doors' && <Doors />}
      {scene === 'snape' && <SpellBook cast={cast} onCast={castSpell} />}
      {scene === 'quidditch' && <QuidditchOverlay result={result} hoops={hoops} off={off} onToggle={toggleCheck} onFly={() => flyRun(off)} />}
      {scene === 'live' && <Live sort={sort} doors={doors} setDoors={setDoors} onSend={send} onReset={reset} />}
      {scene === 'fin' && <Fin />}
      {dead && <Avada onRevive={revive} />}
    </div>
  )
}

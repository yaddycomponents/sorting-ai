import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, useGLTF } from '@react-three/drei'
import { Box3, CatmullRomCurve3, Color, MathUtils, Vector3 } from 'three'
import { Interactive } from './Interactive'
import { say } from '../voice'

// The castle gates: the pre-classification checks as a corridor of stone arches.
// An owl letter flies down it; the first failing gate stops it. Gates 1–3 stop it
// silently (no record); 4–9 drop a portcullis and turn it away to Slytherin.
export const GATES = [
  { name: 'Licence', note: 'AI auto-reply or auto-actions', silent: true, scenario: 'Not licensed' },
  { name: 'From a customer', note: 'sender is a customer contact', silent: true, scenario: 'Our team replied' },
  { name: 'Not already sorted', note: 'each email is sorted once', silent: true, scenario: 'Duplicate' },
  { name: 'Known customer', code: 'DROPPED_INELIGIBLE', scenario: 'Unknown sender' },
  { name: 'No echo loop', code: 'DROPPED_LOOP', scenario: 'Own mailbox' },
  { name: 'Not a robot', code: 'DROPPED_HEADER', scenario: 'Out-of-office' },
  { name: 'Someone may act', code: 'DROPPED_INELIGIBLE', scenario: 'Nobody may act' },
  { name: 'Not from the past', code: 'DROPPED_HISTORICAL', scenario: 'Pre-connection' },
  { name: 'Fresh: under 24 hours', code: 'DROPPED_STALE', scenario: '3 days old' },
]

const START_Z = 4.0

// Nine gatehouses (the user's Tripo model) in a line up a cobblestone path to the
// Hat, seen on the diagonal so every one is visible. Hedwig flies through each arch.
const GATE_GLB = '/dem/gate.glb'
const GATE_SCALE = 3.4 // native 0.98 × 0.79 × 0.80 → arch opening ~0.8 wide, ~1.7 tall
const ARCH_Y = 0.9 // flight height: the middle of the arch opening
const FRONT = 0.402 * GATE_SCALE // the arch's front face, from the gatehouse centre
const gateZ = (i) => -1.5 - i * 3.2
const gateX = (i) => Math.sin(i * 0.55) * 1.1 // a gentle curve, not a zig-zag
const LABEL_Y = 0.79 * GATE_SCALE + 0.45 // just above the gatehouse roof
useGLTF.preload(GATE_GLB)
// where the Patronus charges in when gate i turns the owl away: above the path, toward the camera side
export const gatePoint = (i) => [gateX(i) + 1.6, 3.4, gateZ(i) + 1.8]
export const HAT_Z = gateZ(8) - 3.2
// Hedwig's route: the entrance, through every arch, to the Hat.
const PATH = new CatmullRomCurve3([
  new Vector3(0, 1.5, START_Z),
  ...Array.from({ length: 9 }, (_, i) => new Vector3(gateX(i), ARCH_Y, gateZ(i))),
  new Vector3(0, 1.3, HAT_Z + 0.6),
])
const PATH_LEN = PATH.getLength()

// Screen-space anchors for the 2D fluid ink, refreshed every frame: Ron's and
// Snape's wand tips, each gate's centre, and the Hat.
export const fx = {
  ron: { x: 0, y: 0, ok: false },
  snape: { x: 0, y: 0, ok: false },
  gates: Array.from({ length: 9 }, () => ({ x: 0, y: 0 })),
  labels: Array.from({ length: 9 }, () => ({ x: 0, y: 0, z: 0 })), // over each roof; z = depth (0 near … 1 far)
  hat: { x: 0, y: 0 },
  letter: { x: 0, y: 0 },
  patronus: { x: 0, y: 0 }, // where Expecto Patronum erupts (the turned-away gate)
}
// Where Snape stands for this scene (the single Snape model moves here; see World).
export const SNAPE_HOME = [2.6, 0.1, -27.5] // beside the Hat at the far end
const SPEED = 6.5
export const LAUNCH = 1.0 // seconds from click to the letter taking off

const GOLD = new Color('#ffd27a')
const GREEN = new Color('#2fd07a')
const ASH = new Color('#6d6a62')
const DIM = new Color('#3a3226')
const FIRE = new Color('#ff9a4a')

// Tripo exports come out glossy; give clones their own matte materials.
function matte(obj, roughness) {
  obj.traverse((o) => {
    if (!o.isMesh) return
    o.material = o.material.clone()
    o.material.metalness = 0
    o.material.roughness = roughness
    o.castShadow = true
    o.receiveShadow = true
  })
  return obj
}

// ── one gate ─────────────────────────────────────────────────────

function Gate({ i, state }) {
  const { scene } = useGLTF(GATE_GLB)
  const house = useMemo(() => matte(scene.clone(true), 0.95), [scene])
  const rune = useRef()
  const bars = useRef()
  const torch = useRef()
  const flash = useRef(0)
  const prev = useRef(state)

  useFrame(({ clock }, dt) => {
    if (state !== prev.current) { prev.current = state; flash.current = 1 }
    flash.current = Math.max(0, flash.current - dt * 1.3)
    const m = rune.current.material
    const target = state === 'pass' ? GOLD : state === 'fail' ? GREEN : state === 'silent' ? ASH : DIM
    m.color.lerp(target, 1 - Math.exp(-8 * dt))
    const glow = state === 'pending' ? 0.6 : state === 'silent' ? 0.8 : 2.2
    rune.current.scale.setScalar(1 + flash.current * 0.08)
    m.opacity = Math.min(1, glow / 2.2 + flash.current * 0.5)
    // the arch torch flickers; it flares in the gate's colour on a verdict
    const t = clock.elapsedTime + i * 1.7
    torch.current.intensity = 8 + Math.sin(t * 9) * 1.1 + Math.sin(t * 23) * 0.6 + flash.current * 14
    torch.current.color.copy(state === 'fail' ? GREEN : state === 'pass' ? GOLD : FIRE)
    // portcullis: hidden above, slams down on a turn-away
    const down = state === 'fail'
    bars.current.visible = down || bars.current.position.y < 3.4
    bars.current.position.y = down
      ? Math.max(ARCH_Y, bars.current.position.y - dt * 14)
      : MathUtils.damp(bars.current.position.y, 4.5, 4, dt)
  })

  return (
    <group position={[gateX(i), 0, gateZ(i)]}>
      <primitive object={house} scale={GATE_SCALE} />
      {/* rune arc round the arch opening: lights up with the gate's verdict */}
      <mesh ref={rune} position={[0, ARCH_Y + 0.25, FRONT + 0.03]}>
        <torusGeometry args={[0.5, 0.025, 8, 48, Math.PI]} />
        <meshBasicMaterial color={DIM} toneMapped={false} transparent opacity={0.3} />
      </mesh>
      {/* a torch beside the arch: real falloff, and a visible flame so the light is motivated */}
      <pointLight ref={torch} position={[0.6, 1.9, FRONT + 0.5]} distance={8} decay={2} color={FIRE} />
      <mesh position={[0.6, 1.9, FRONT + 0.45]} scale={[0.05, 0.09, 0.05]}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial color={[6, 3, 1.2]} toneMapped={false} />
      </mesh>
      <group ref={bars} position={[0, 4.5, FRONT + 0.06]} visible={false}>
        {Array.from({ length: 5 }, (_, k) => (
          <mesh key={k} position={[-0.36 + k * 0.18, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.75, 6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {[-0.55, 0, 0.55].map((k) => (
          <mesh key={k} position={[0, k, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.02, 0.02, 0.85, 6]} />
            <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} />
          </mesh>
        ))}
        {state === 'fail' && <pointLight position={[0, 0, 0.5]} color="#2fd07a" intensity={6} distance={4} />}
      </group>
    </group>
  )
}

// ── Hedwig: she carries the email (the model already holds a letter) ──

const OWL_GLB = '/dem/owl.glb'
useGLTF.preload(OWL_GLB)
export function Owl() {
  const { scene } = useGLTF(OWL_GLB)
  const wing = useRef()
  useFrame(({ clock }) => {
    // a wingbeat feel from a static pose: bob and a slight roll
    const t = clock.elapsedTime
    wing.current.position.y = Math.sin(t * 9) * 0.04
    wing.current.rotation.z = Math.sin(t * 4.5) * 0.06
  })
  // native 0.98 wingspan, base at y = 0, facing +z; centred on the letter she holds
  return <group ref={wing}><primitive object={scene} scale={0.85} position={[0, -0.25, 0]} /></group>
}

// ── Dementors: they circle above, and swoop at a gate that turns the owl away ──

const DEMENTOR_GLB = '/dem/dementor.glb'
useGLTF.preload(DEMENTOR_GLB)
function Dementor({ phase, swoop, repel }) {
  const { scene } = useGLTF(DEMENTOR_GLB)
  const body = useMemo(() => matte(scene.clone(true), 0.85), [scene])
  const g = useRef()
  const side = phase ? 1 : -1
  // they hang in the air either side of the far gates, barely moving: menace, not motion
  const home = useMemo(() => new Vector3(side * 4.2, 3.3, gateZ(phase ? 4 : 6)), [side, phase])
  const target = useMemo(() => new Vector3(), [])
  const repelAt = useRef({ key: null, t: 0 })
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    if (repel && repel !== repelAt.current.key) repelAt.current = { key: repel, t }
    // Expecto Patronum: once the Patronus has formed, they flee into the sky
    const fleeing = repel && t - repelAt.current.t > 1.8
    if (fleeing) target.set(side * 14, 10, -34)
    else if (swoop != null) target.set(gateX(swoop) + side * 1.3, 2.4, gateZ(swoop) + FRONT + 0.8)
    else target.copy(home)
    target.y += Math.sin(t * 0.6 + phase) * 0.12 // slow hover
    const k = fleeing ? 1.6 : swoop != null ? 1.4 : 0.8 // glide, never dart
    g.current.position.x = MathUtils.damp(g.current.position.x, target.x, k, dt)
    g.current.position.y = MathUtils.damp(g.current.position.y, target.y, k, dt)
    g.current.position.z = MathUtils.damp(g.current.position.z, target.z, k, dt)
    g.current.rotation.y = -side * 0.35 // turned toward the path
    g.current.rotation.z = Math.sin(t * 0.4 + phase) * 0.03
  })
  return (
    <group ref={g} position={home}>
      <Interactive lift={0.2} glow="#7fe0a0" glowAt={[0, 1.4, 1]}><primitive object={body} scale={2.4} /></Interactive>
    </group>
  )
}

// ── Ron ──────────────────────────────────────────────────────────

const RON_GLB = '/ron/ron.glb'
let probe
function hasRonModel() {
  // Vite's SPA fallback answers missing files with index.html, so check the type.
  probe ??= fetch(RON_GLB, { method: 'HEAD' })
    .then((r) => r.ok && !(r.headers.get('content-type') || '').includes('html'))
    .catch(() => false)
  return probe
}

function PlaceholderRon() {
  return (
    <group>
      <mesh position={[0, 0.72, 0]}>
        <coneGeometry args={[0.42, 1.45, 20]} />
        <meshStandardMaterial color="#141418" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.2, 24, 24]} />
        <meshStandardMaterial color="#e9c4a6" roughness={0.7} />
      </mesh>
    </group>
  )
}

function ModelRon() {
  const { scene } = useGLTF(RON_GLB)
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene)
    const size = box.getSize(new Vector3())
    const c = box.getCenter(new Vector3())
    const s = 2.0 / size.y
    return { s, x: -c.x * s, y: -box.min.y * s, z: -c.z * s }
  }, [scene])
  // scale a wrapper, never the shared scene: re-measuring an already-scaled scene
  // on a remount (revisiting the slide, hot reload) shrank him
  useMemo(() => scene.traverse((o) => { if (o.isMesh) o.castShadow = true }), [scene])
  return <group scale={fit.s} position={[fit.x, fit.y, fit.z]}><primitive object={scene} /></group>
}

function RonBody() {
  const [model, setModel] = useState(null) // null while checking: draw nothing, so no placeholder flash
  useEffect(() => { let live = true; hasRonModel().then((ok) => live && setModel(ok)); return () => { live = false } }, [])
  if (model === null) return null
  return model ? <Suspense fallback={null}><ModelRon /></Suspense> : <PlaceholderRon />
}

// The model's wand tip after ModelRon's fit (native tip (0.011, 0.367, 0.490) ×
// 2.0 / 0.882 height), found from the mesh like Snape's.
const RON_TIP = [0.025, 0.832, 1.11]

// react: { key, kind: 'cast' | 'fail' | 'cheer' }: his wand reacts to the run.
function Ron({ react }) {
  const g = useRef()
  const tip = useRef()
  const v = useMemo(() => new Vector3(), [])
  const at = useRef({ key: null, t: 0 })
  const [spark, setSpark] = useState(null)

  useFrame(({ clock, camera, size }) => {
    tip.current.getWorldPosition(v).project(camera)
    fx.ron.x = (v.x * 0.5 + 0.5) * size.width
    fx.ron.y = (-v.y * 0.5 + 0.5) * size.height
    fx.ron.ok = true
    const t = clock.elapsedTime
    if (react && react.key !== at.current.key) { at.current = { key: react.key, t }; setSpark(react) }
    const since = t - at.current.t
    const kind = at.current.key ? react?.kind : null
    let rz = Math.sin(t * 0.8) * 0.02
    let y = 0
    if (kind === 'cast' && since < 0.7) rz += Math.sin((since / 0.7) * Math.PI) * 0.16 // the flick that sends the owl
    if (kind === 'fail' && since < 1.6) rz += Math.sin(since * 22) * 0.12 * (1 - since / 1.6) // the wand kicks back
    if (kind === 'cheer' && since < 1.2) y = Math.abs(Math.sin(since * Math.PI * 2.5)) * 0.25 * (1 - since / 1.2)
    g.current.rotation.z = rz
    g.current.position.y = y
    if (spark && since > 2.2) setSpark(null)
  })

  return (
    <group position={[4.6, 0, 0.2]} rotation={[0, 1.1, 0]}>{/* at the entrance, turned toward the camera */}
      <group ref={g}>
        <Interactive onPoke={() => say('ron-g4')} glowAt={[0.3, 1.6, 1.2]}><RonBody /></Interactive>
        <group ref={tip} position={RON_TIP} />
      </group>
      {spark && spark.kind !== 'cast' && (
        <group key={spark.key} position={[-0.45, 1.6, 0.35]}>
          <Sparkles count={spark.kind === 'fail' ? 45 : 60} scale={spark.kind === 'fail' ? 0.9 : 1.8} size={spark.kind === 'fail' ? 7 : 5}
            speed={spark.kind === 'fail' ? 2.5 : 1.2} color={spark.kind === 'fail' ? '#3fe08a' : '#ffd27a'} />
          <pointLight color={spark.kind === 'fail' ? '#2fd07a' : '#ffd27a'} intensity={4} distance={3} />
        </group>
      )}
      <pointLight position={[0.6, 2.4, 1.6]} intensity={5} distance={4.5} decay={1.4} color="#ffe2b8" />
    </group>
  )
}

// ── the run ──────────────────────────────────────────────────────

// run: { key, stopAt: null | gate index, idle? }. states: per-gate verdicts held by App.
export function Gates({ run, states, onPass, onStop, onDone, repel }) {
  const letter = useRef()
  const s = useRef({ t0: null, passed: 0, end: null })
  const [react, setReact] = useState(null)
  const swoop = states.findIndex((x) => x === 'fail')

  useEffect(() => {
    s.current = { t0: null, passed: 0, end: null }
    if (!run.idle) setReact({ key: `${run.key}-cast`, kind: 'cast' })
  }, [run.key, run.idle])

  const pv = useMemo(() => new Vector3(), [])
  const tan = useMemo(() => new Vector3(), [])
  useFrame(({ clock, camera, size }, dt) => {
    for (let i = 0; i < 9; i++) {
      pv.set(gateX(i), ARCH_Y + 0.3, gateZ(i) + FRONT).project(camera)
      fx.gates[i].x = (pv.x * 0.5 + 0.5) * size.width
      fx.gates[i].y = (-pv.y * 0.5 + 0.5) * size.height
      pv.set(gateX(i), LABEL_Y + (i % 2) * 1.1, gateZ(i)).project(camera) // staggered so far labels don't collide
      fx.labels[i].x = (pv.x * 0.5 + 0.5) * size.width
      fx.labels[i].y = (-pv.y * 0.5 + 0.5) * size.height
      fx.labels[i].z = i / 8
    }
    if (letter.current) {
      pv.copy(letter.current.position).project(camera)
      fx.letter.x = (pv.x * 0.5 + 0.5) * size.width
      fx.letter.y = (-pv.y * 0.5 + 0.5) * size.height
    }
    const fi = Math.max(0, states.findIndex((x) => x === 'fail'))
    pv.set(...gatePoint(fi)).project(camera)
    fx.patronus.x = (pv.x * 0.5 + 0.5) * size.width
    fx.patronus.y = (-pv.y * 0.5 + 0.5) * size.height
    pv.set(0, 1.2, HAT_Z).project(camera)
    fx.hat.x = (pv.x * 0.5 + 0.5) * size.width
    fx.hat.y = (-pv.y * 0.5 + 0.5) * size.height
    const st = s.current
    const now = clock.elapsedTime
    const g = letter.current
    if (run.idle) { // waiting at the entrance for the presenter to pick a scenario
      g.visible = true
      g.scale.setScalar(1)
      g.position.set(0, 1.5 + Math.sin(now * 2) * 0.08, START_Z)
      g.rotation.set(0, Math.PI, Math.sin(now * 3) * 0.06) // facing up the path, away from us
      return
    }
    if (st.t0 === null) st.t0 = now + LAUNCH // Ron's spell reaches the letter first

    if (st.end) {
      const e = st.end
      if (e.kind === 'silent') { g.scale.setScalar(Math.max(0.001, g.scale.x - dt * 1.4)) } // quietly fades away
      if (e.kind === 'fail') {
        e.vy -= 9.8 * dt
        g.position.z += e.vz * dt
        g.position.y = Math.max(0.1, g.position.y + e.vy * dt)
        g.rotation.x += dt * 6
        if (g.position.y <= 0.1) { e.vz *= Math.pow(0.02, dt); e.vy = 0; g.rotation.x = MathUtils.damp(g.rotation.x, Math.PI / 2, 8, dt) }
      }
      if (e.kind === 'hat') g.scale.setScalar(Math.max(0.001, g.scale.x - dt * 2))
      return
    }

    const dist = Math.max(0, (now - st.t0) * SPEED)
    const u = Math.min(1, dist / PATH_LEN)
    PATH.getPointAt(u, g.position)
    PATH.getTangentAt(u, tan)
    const z = g.position.z
    g.visible = true
    g.rotation.set(0, Math.atan2(tan.x, tan.z), Math.sin(now * 5) * 0.1) // face where she flies
    g.scale.setScalar(1)

    // credit every gate crossed this frame (a slow frame can cross several)
    while (st.passed < 9 && z <= gateZ(st.passed) + FRONT * 0.3) {
      const i = st.passed
      if (run.stopAt === i) {
        const silent = GATES[i].silent
        g.position.z = gateZ(i) + FRONT + 0.3
        st.end = silent ? { kind: 'silent' } : { kind: 'fail', vz: 1.3, vy: 1.2 }
        onStop?.(i)
        setReact({ key: run.key, kind: 'fail' })
        return
      }
      st.passed++
      onPass?.(i)
    }
    if (u >= 1) {
      st.end = { kind: 'hat' }
      onDone?.()
      setReact({ key: run.key, kind: 'cheer' })
    }
  })

  return (
    <group>
      {GATES.map((_, i) => <Gate key={i} i={i} state={states[i]} />)}
      <pointLight position={[0, 4.2, HAT_Z + 1.5]} intensity={14} distance={8} decay={1.4} color="#ffe2b8" />
      <group ref={letter} position={[0, 1.5, START_Z]} visible={false}>
        <Owl />
      </group>
      <Dementor phase={0} swoop={swoop >= 0 ? swoop : null} repel={repel} />
      <Dementor phase={Math.PI} swoop={swoop >= 0 ? swoop : null} repel={repel} />
      <Ron react={react} />
    </group>
  )
}

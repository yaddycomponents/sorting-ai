import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles, Trail, useGLTF } from '@react-three/drei'
import { Box3, Color, MathUtils, Shape, Vector3 } from 'three'
import { Envelope } from './Letter'

// The five reply checks as goal hoops; the email is a Golden Snitch that must
// clear every one. run: { key, off: [bool × 5] }: it fails at the first check switched off.
export const CHECKS = [
  { check: 'Model recommends sending', fail: 'ABSTAINED' },
  { check: 'Confidence ≥ 0.80', fail: 'ABSTAINED' },
  { check: 'Theme switched on', fail: 'SHADOW' },
  { check: 'Attachment found', fail: 'ABSTAINED_GROUNDING' },
  // the reply is sent FROM this mailbox; CC doesn't count, and the actions source never applies
  { check: 'AR mailbox in To: the reply\'s sender', short: 'AR mailbox in To', note: 'Always required for a reply, whatever the actions source.', fail: 'ABSTAINED_NO_REPLY_IDENTITY' },
]

// Each hoop's label anchor in screen pixels, refreshed every frame; the labels
// live in the 2D overlay (drei <Html> roots got torn down mid-render here).
export const hoopScreen = [0, 1, 2, 3, 4].map(() => ({ x: 0, y: 0 }))

const HOOP_X = [-5.2, -2.6, 0, 2.6, 5.2]
const HOOP_Y = [2.5, 2.9, 2.6, 2.95, 2.55] // uneven heights, like a real pitch
const R = 0.58
const START = -8.4
const END = 6.9
const SPEED = 2.6 // units per second

// ── the snitch ───────────────────────────────────────────────────

const SNITCH_GLB = '/snitch/snitch.glb'
let probe
function hasSnitchModel() {
  // Vite's SPA fallback answers missing files with index.html, so check the type.
  probe ??= fetch(SNITCH_GLB, { method: 'HEAD' })
    .then((r) => r.ok && !(r.headers.get('content-type') || '').includes('html'))
    .catch(() => false)
  return probe
}

function wingShape() {
  const s = new Shape()
  s.moveTo(0, 0)
  s.bezierCurveTo(0.08, 0.16, 0.34, 0.2, 0.46, 0.1)
  s.bezierCurveTo(0.36, 0.06, 0.3, 0.0, 0.34, -0.06)
  s.bezierCurveTo(0.2, -0.04, 0.08, -0.06, 0, 0)
  return s
}

function PlaceholderSnitch() {
  const wings = useMemo(() => wingShape(), [])
  const left = useRef()
  const right = useRef()
  useFrame(({ clock }) => {
    const f = Math.sin(clock.elapsedTime * 38) * 0.9
    left.current.rotation.x = f
    right.current.rotation.x = f
  })
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.11, 32, 32]} />
        <meshStandardMaterial color="#e8b84a" metalness={1} roughness={0.22} emissive="#8a5a10" emissiveIntensity={0.6} />
      </mesh>
      <group ref={right} position={[0.02, 0.02, 0]}>
        <mesh rotation={[0, 0, 0.35]}>
          <shapeGeometry args={[wings]} />
          <meshStandardMaterial color="#f4f1ea" metalness={0.6} roughness={0.3} emissive="#ffffff" emissiveIntensity={0.25} side={2} transparent opacity={0.92} />
        </mesh>
      </group>
      <group ref={left} position={[-0.02, 0.02, 0]} scale={[-1, 1, 1]}>
        <mesh rotation={[0, 0, 0.35]}>
          <shapeGeometry args={[wings]} />
          <meshStandardMaterial color="#f4f1ea" metalness={0.6} roughness={0.3} emissive="#ffffff" emissiveIntensity={0.25} side={2} transparent opacity={0.92} />
        </mesh>
      </group>
    </group>
  )
}

// The user's model, normalised to the placeholder's size, with a wing-like flutter.
function ModelSnitch() {
  const { scene } = useGLTF(SNITCH_GLB)
  const g = useRef()
  const scale = useMemo(() => {
    const size = new Box3().setFromObject(scene).getSize(new Vector3())
    return 0.62 / Math.max(size.x, size.y, size.z)
  }, [scene])
  // a slight buzz; the real wings are part of the mesh
  useFrame(({ clock }) => { g.current.rotation.z = Math.sin(clock.elapsedTime * 30) * 0.05 })
  return <group ref={g}><group scale={scale}><primitive object={scene} /></group></group>
}

function SnitchBody() {
  const [model, setModel] = useState(false)
  useEffect(() => { let live = true; hasSnitchModel().then((ok) => live && setModel(ok)); return () => { live = false } }, [])
  return model ? <Suspense fallback={<PlaceholderSnitch />}><ModelSnitch /></Suspense> : <PlaceholderSnitch />
}

// ── hoops ────────────────────────────────────────────────────────

const BRASS = new Color('#8a6a30')
const GOLD = new Color('#ffd27a')
const RED = new Color('#ff4a3d')
const EMBER = new Color('#5a1410') // switched off, waiting

function Hoop({ i, state }) {
  const ring = useRef()
  const light = useRef()
  const flash = useRef(0)
  const prev = useRef(state)

  useFrame((_, dt) => {
    if (state !== prev.current) { prev.current = state; flash.current = 1 }
    flash.current = Math.max(0, flash.current - dt * 1.4)
    const m = ring.current.material
    const target = state === 'pass' ? GOLD : state === 'fail' ? RED : state === 'off' ? EMBER : BRASS
    m.emissive.lerp(target, 1 - Math.exp(-8 * dt))
    const base = state === 'pending' ? 0.15 : state === 'off' ? 0.9 : 1.4
    m.emissiveIntensity = base + flash.current * 3
    light.current.color.copy(m.emissive)
    light.current.intensity = state === 'pending' || state === 'off' ? 0 : 3 + flash.current * 10
  })

  const y = HOOP_Y[i]
  return (
    <group position={[HOOP_X[i], 0, -0.6]}>
      {/* pole + base */}
      <mesh position={[0, (y - R) / 2, 0]}>
        <cylinderGeometry args={[0.045, 0.06, y - R, 12]} />
        <meshStandardMaterial color="#5a3c1c" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.06, 20]} />
        <meshStandardMaterial color="#3d2610" roughness={0.7} />
      </mesh>
      {/* the hoop */}
      <mesh ref={ring} position={[0, y, 0]}>
        <torusGeometry args={[R, 0.055, 16, 64]} />
        <meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} emissive="#8a6a30" emissiveIntensity={0.15} />
      </mesh>
      <pointLight ref={light} position={[0, y, 0.6]} distance={3.5} decay={1.5} intensity={0} />
    </group>
  )
}

// ── the run ──────────────────────────────────────────────────────

// Where the snitch is at distance s along the course (weaving through each hoop centre).
function course(s, out) {
  const x = START + s
  // interpolate height between hoop centres, plus a gentle weave
  let y = HOOP_Y[0]
  if (x <= HOOP_X[0]) y = MathUtils.lerp(1.7, HOOP_Y[0], MathUtils.clamp((x - START) / (HOOP_X[0] - START), 0, 1))
  else if (x >= HOOP_X[4]) y = MathUtils.lerp(HOOP_Y[4], 2.4, MathUtils.clamp((x - HOOP_X[4]) / (END - HOOP_X[4]), 0, 1))
  else {
    const k = HOOP_X.findIndex((hx, j) => x >= hx && x <= HOOP_X[j + 1])
    const u = (x - HOOP_X[k]) / (HOOP_X[k + 1] - HOOP_X[k])
    y = MathUtils.lerp(HOOP_Y[k], HOOP_Y[k + 1], u) + Math.sin(u * Math.PI) * 0.45
  }
  const z = -0.6 + Math.sin(s * 1.9) * 0.18 * Math.min(1, Math.abs(Math.cos((x / 2.6) * Math.PI)) + 0.2)
  return out.set(x, y, z)
}

export function Quidditch({ run, states, onPass, onFail, onDone }) {
  const snitch = useRef()
  const envelope = useRef()
  const [ended, setEnded] = useState(null) // null | 'pass'
  const [flying, setFlying] = useState(false) // the trail mounts once the snitch is on course
  const s = useRef({ t0: null, passed: 0, ended: false, fall: null })
  const v = useMemo(() => new Vector3(), [])
  const p = useMemo(() => new Vector3(), [])

  // a new run resets everything
  useEffect(() => {
    s.current = { t0: null, passed: 0, ended: false, fall: null }
    setEnded(null)
    setFlying(false)
  }, [run.key])

  useFrame(({ clock, camera, size }, dt) => {
    HOOP_X.forEach((hx, i) => {
      p.set(hx, HOOP_Y[i] + R + 0.15, -0.6).project(camera)
      hoopScreen[i].x = (p.x * 0.5 + 0.5) * size.width
      hoopScreen[i].y = (-p.y * 0.5 + 0.5) * size.height
    })
    const st = s.current
    const now = clock.elapsedTime
    if (st.t0 === null) st.t0 = now + 0.9 // let the hoops settle in frame first
    const g = snitch.current
    const dist = Math.max(0, (now - st.t0) * SPEED)

    if (st.fall) {
      // clipped the rim: knocked back, tumbling down
      st.fall.vy -= 9.8 * dt
      g.position.x += st.fall.vx * dt
      g.position.y = Math.max(0.12, g.position.y + st.fall.vy * dt)
      g.rotation.z += dt * 9
      if (g.position.y <= 0.12) {
        st.fall.vy = Math.abs(st.fall.vy) > 1 ? -st.fall.vy * 0.35 : 0
        st.fall.vx *= Math.pow(0.02, dt) // floor friction: it settles near the hoop it hit
        if (st.fall.vy === 0) g.rotation.z *= 0.9
      }
      return
    }
    if (st.ended) return

    course(dist, v)
    g.position.copy(v)
    g.rotation.z = Math.sin(now * 3) * 0.2
    g.visible = now >= st.t0
    if (g.visible && !flying) setFlying(true)

    // credit every hoop plane crossed this frame (a slow frame can cross several)
    while (st.passed < 5) {
      const next = st.passed
      const failing = run.off[next]
      if (v.x < HOOP_X[next] - (failing ? 0.12 : 0)) break
      if (failing) {
        course(HOOP_X[next] - 0.12 - START, g.position) // bounce off the rim, not past it
        st.fall = { vx: -1.6, vy: 1.4 }
        onFail?.(next)
        return
      }
      st.passed++
      onPass?.(next)
    }
    if (v.x >= END) {
      st.ended = true
      g.visible = false
      course(END - START, envelope.current.position) // the finish line, even after a slow frame overshoots
      setEnded('pass')
      onDone?.()
    }
  })

  return (
    <group>
      {CHECKS.map((_, i) => <Hoop key={i} i={i} state={states[i]} />)}
      <pointLight position={[0, 5, 3]} intensity={18} distance={14} decay={1.3} color="#ffe2b8" />

      <Trail key={`${run.key}-${flying}`} width={flying ? 0.9 : 0} length={7} color="#ffd27a" attenuation={(x) => x * x}>
        <group ref={snitch} position={[START, 1.7, -0.6]} visible={false}>
          <SnitchBody />
          <pointLight intensity={2.5} distance={2.2} color="#ffd27a" />
        </group>
      </Trail>

      {/* success: the snitch becomes a sealed reply */}
      <group ref={envelope} visible={ended === 'pass'} scale={1.6}>
        {ended === 'pass' && (
          <>
            <Envelope color="#f1d27a" seal="#8e1b1b" glow={0.7} />
            <Sparkles count={60} scale={1.6} size={5} speed={1.2} color="#ffd27a" />
          </>
        )}
      </group>
    </group>
  )
}

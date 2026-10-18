import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import { Envelope, Flight } from './Letter'
import { Owl } from './Gates'

// The live sort as a story: Hedwig carries the customer's letter across the hall,
// drops it into the Hat, and the verdict plays out by house.
// Timeline (App): flying = OWL_IN s, then thinking, then decided.
export const OWL_IN = 4.6
const HAT_TOP = [0, 2.6, 0.1]
const DROP = [0, 3.4, 0.8] // where Hedwig lets go

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

// Hedwig along a curve, facing where she flies.
function OwlFlight({ points, duration, delay = 0, scale = 0.95 }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map((p) => new Vector3(...p))), [points])
  const g = useRef()
  const t0 = useRef(null)
  const tan = useMemo(() => new Vector3(), [])
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime + delay
    const p = MathUtils.clamp((clock.elapsedTime - t0.current) / duration, 0, 1)
    g.current.visible = clock.elapsedTime >= t0.current && p < 1
    curve.getPointAt(ease(p), g.current.position)
    curve.getTangentAt(ease(p), tan)
    g.current.rotation.y = Math.atan2(tan.x, tan.z)
    g.current.rotation.z = -tan.x * 0.25 // bank into the turn
  })
  return <group ref={g} visible={false} scale={scale}><Owl /></group>
}

// Small parchment scrolls (one per PTP / dispute) rising out of the Hat.
function Scrolls({ count }) {
  const refs = useRef([])
  const t0 = useRef(null)
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime + 0.9
    const t = clock.elapsedTime - t0.current
    refs.current.forEach((m, i) => {
      if (!m) return
      const k = ease(MathUtils.clamp((t - i * 0.25) / 1.2, 0, 1))
      const a = count === 1 ? 0 : (i / (count - 1) - 0.5) * 1.4
      m.position.set(Math.sin(a) * 2.4 * k, HAT_TOP[1] + 0.2 + k * 0.7 + Math.sin(t * 1.5 + i) * 0.05, HAT_TOP[2] + 0.6) // either side of the Hat, below the banner
      m.rotation.z = Math.sin(t * 1.2 + i) * 0.08
      m.visible = t > i * 0.25
    })
  })
  return Array.from({ length: count }, (_, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)} visible={false}>
      <mesh>
        <boxGeometry args={[0.55, 0.32, 0.015]} />
        <meshStandardMaterial color="#efe3c4" roughness={0.8} emissive="#ffcf6a" emissiveIntensity={0.35} />
      </mesh>
      {/* rolled ends */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.28, 0, 0.01]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, 0.34, 12]} />
          <meshStandardMaterial color="#d9c494" roughness={0.8} />
        </mesh>
      ))}
      <Sparkles count={12} scale={0.7} size={3} speed={0.6} color="#ffd27a" />
    </group>
  ))
}

// Ravenclaw: the letter rises into a pale-blue glow and hangs there for a human.
function ForAHuman() {
  const g = useRef()
  const t0 = useRef(null)
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime + 0.9
    const t = clock.elapsedTime - t0.current
    const k = ease(MathUtils.clamp(t / 1.4, 0, 1))
    g.current.visible = t > 0
    g.current.position.set(0, HAT_TOP[1] + 0.2 + k * 1.6 + Math.sin(t * 1.4) * 0.06, HAT_TOP[2] + 0.5)
    g.current.rotation.y = Math.sin(t * 0.8) * 0.3
  })
  return (
    <group ref={g} visible={false}>
      <Envelope glow={0.5} />
      <pointLight color="#7d9cf0" intensity={6} distance={3} />
      <Sparkles count={40} scale={1.4} size={4} speed={0.4} color="#9fb6ff" />
    </group>
  )
}

// Slytherin: the Hat spits the letter out; it tumbles and burns away in green smoke.
function SpatOut() {
  const g = useRef()
  const burn = useRef()
  const t0 = useRef(null)
  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime + 0.8
    const t = clock.elapsedTime - t0.current
    const k = MathUtils.clamp(t / 1.3, 0, 1)
    g.current.visible = t > 0 && t < 2.2
    g.current.position.set(-2.4 * k, HAT_TOP[1] + 0.3 + Math.sin(k * Math.PI) * 1.2 - k * 0.6, HAT_TOP[2] + 0.6)
    g.current.rotation.z += 0.12
    g.current.scale.setScalar(Math.max(0.001, 1 - MathUtils.clamp((t - 1.0) / 1.2, 0, 1)))
    burn.current.visible = t > 0.9 && t < 3.2
    burn.current.position.copy(g.current.position)
  })
  return (
    <>
      <group ref={g} visible={false}><Envelope glow={0.2} /></group>
      <group ref={burn} visible={false}>
        <Sparkles count={60} scale={1.2} size={6} speed={1.4} color="#3fe08a" />
        <pointLight color="#2fd07a" intensity={5} distance={3} />
      </group>
    </>
  )
}

export function LiveStage({ sort }) {
  if (sort.phase === 'idle') return null
  const k = sort.key
  const res = sort.res
  return (
    <group>
      {sort.phase === 'flying' && (
        <>
          {/* Hedwig sweeps in through the candles and lets go above the Hat */}
          {/* in frame the whole way: a wide swoop from the left, a hover over the Hat, then away */}
          <OwlFlight key={`owl-in${k}`} duration={OWL_IN}
            points={[[-4.6, 3.6, 3.2], [-3, 4.4, 2.4], [-1.2, 3.9, 1.4], [-0.3, 3.5, 1.0], DROP, [0.3, 3.5, 0.8], [2.6, 4.6, 0.6], [6, 6, 0]]} />
          <Flight key={`drop${k}`} delay={OWL_IN * 0.52} points={[DROP, [0, 3.0, 0.5], HAT_TOP]}
            duration={0.9} shrink glow={0.3} size={0.8} />
        </>
      )}
      {sort.phase === 'decided' && res.house === 'gryffindor' && (
        <>
          {/* a gold reply rises; Hedwig takes it back out to the customer */}
          <Flight key={`out${k}`} points={[HAT_TOP, [0, 3.6, 0.6], [-3, 4.6, 1.4], [-9, 4.4, 2.2]]} duration={2.4} delay={1.0}
            color="#f1d27a" seal="#740001" glow={0.6} />
          <OwlFlight key={`owl-out${k}`} delay={1.15} duration={2.4} points={[[0, 3.8, 0.6], [-3, 4.8, 1.4], [-9, 4.6, 2.2]]} />
        </>
      )}
      {sort.phase === 'decided' && res.house === 'hufflepuff' && (
        <Scrolls key={`scr${k}`} count={Math.max(1, res.actions.filter((a) => !a.skipped).length)} />
      )}
      {sort.phase === 'decided' && res.house === 'ravenclaw' && <ForAHuman key={`rav${k}`} />}
      {sort.phase === 'decided' && res.house === 'slytherin' && <SpatOut key={`sly${k}`} />}
    </group>
  )
}

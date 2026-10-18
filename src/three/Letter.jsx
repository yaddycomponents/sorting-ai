import { Suspense, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { CatmullRomCurve3, Color, Vector3, MathUtils } from 'three'

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

// The user's Tripo letter (parchment, red wax seal; 61 MB → 3.2 MB). Native size
// 0.98 × 0.67, seal facing +z; scaled to the old 0.62-wide envelope and centred.
const LETTER = '/envelped/letter.glb'
const LETTER_SCALE = 0.62 / 0.978
useGLTF.preload(LETTER)

// An owl-post envelope. `color` tints it (gold for a reply), `glow` lights it.
export function Envelope(props) {
  return (
    <Suspense fallback={<DrawnEnvelope {...props} />}>
      <ModelEnvelope {...props} />
    </Suspense>
  )
}

function ModelEnvelope({ color = '#efe3c4', glow = 0.15 }) {
  const { scene } = useGLTF(LETTER)
  // every flight needs its own copy, with its own materials for tint and glow
  const letter = useMemo(() => {
    const c = scene.clone(true)
    const tint = new Color(color)
    const plain = color.toLowerCase() === '#efe3c4'
    c.traverse((o) => {
      if (!o.isMesh) return
      o.material = o.material.clone()
      if (!plain) o.material.color.lerp(tint, 0.55)
      o.material.emissive = tint
      o.material.emissiveIntensity = glow * 0.18 // the texture is already pale; keep bloom off it
    })
    return c
  }, [scene, color, glow])
  return <primitive object={letter} scale={LETTER_SCALE} position={[0, -0.336 * LETTER_SCALE, 0]} />
}

// The drawn stand-in while the model loads: parchment body, folded flap, wax seal.
function DrawnEnvelope({ color = '#efe3c4', seal = '#8e1b1b', glow = 0.15 }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[0.62, 0.4, 0.02]} />
        <meshStandardMaterial color={color} roughness={0.8} emissive={color} emissiveIntensity={glow} />
      </mesh>
      <mesh position={[0, 0.07, 0.012]} rotation={[0, 0, Math.PI]}>
        <circleGeometry args={[0.36, 3, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.9} emissive={color} emissiveIntensity={glow * 0.6} />
      </mesh>
      <mesh position={[0, -0.03, 0.024]}>
        <cylinderGeometry args={[0.055, 0.055, 0.015, 20]} />
        <meshStandardMaterial color={seal} roughness={0.4} metalness={0.2} />
      </mesh>
    </group>
  )
}

// Flies an envelope along a curve. `stay` keeps it at the end; `shrink` makes it
// vanish into whatever it lands in (the Hat).
export function Flight({ points, duration = 1.4, delay = 0, stay = false, shrink = false, size = 1, onDone, ...env }) {
  const key = JSON.stringify(points)
  const curve = useMemo(() => new CatmullRomCurve3(JSON.parse(key).map((p) => new Vector3(...p))), [key])
  const ref = useRef()
  const start = useRef(null)
  const done = useRef(false)
  const tan = useMemo(() => new Vector3(), [])

  useFrame(({ clock }) => {
    const now = clock.elapsedTime
    if (start.current === null) start.current = now + delay
    const p = MathUtils.clamp((now - start.current) / duration, 0, 1)
    const g = ref.current
    g.visible = now >= start.current && (stay || p < 1)
    curve.getPointAt(ease(p), g.position)
    curve.getTangentAt(ease(p), tan)
    g.rotation.z = Math.atan2(tan.y, tan.x) * 0.35 + Math.sin(now * 6) * 0.05
    g.rotation.y = -tan.z * 0.6
    const s = shrink ? 1 - Math.pow(p, 3) * 0.95 : 1
    g.scale.setScalar(s * size)
    if (p >= 1 && !done.current) { done.current = true; onDone?.() }
  })

  return <group ref={ref} visible={false}><Envelope {...env} /></group>
}

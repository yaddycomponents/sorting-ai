import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import { MathUtils } from 'three'

// The moment Expecto Patronum lands: a silver flare that floods the scene, two
// shockwave rings rolling out, and a shower of glittering motes. Starts after
// \`delay\` (when the Patronus erupts) and fades over ~2.5 s.
// Always mounted (adding a light mid-scene recompiles every material: a visible
// hitch); `trigger` changing fires it.
export function PatronusBurst({ at, trigger, delay = 1.1, color = '#dce8ff' }) {
  const t0 = useRef(null)
  const last = useRef(trigger)
  const light = useRef()
  const rings = [useRef(), useRef()]
  const motes = useRef()
  const k = useMemo(() => [color], [color])
  useFrame(({ clock, camera }) => {
    if (trigger !== last.current) { last.current = trigger; t0.current = trigger ? clock.elapsedTime + delay : null }
    const t = t0.current === null ? -1 : clock.elapsedTime - t0.current
    const on = t > 0
    // a sharp flare, then a long silver glow while the Patronus holds
    // capped: a brighter light next to the gate overflows the half-float frame buffer (Inf → NaN in bloom → black screen)
    light.current.intensity = on ? (t < 0.25 ? MathUtils.lerp(0, 28, t / 0.25) : 28 * Math.exp(-(t - 0.25) * 1.2) + 6 * (t < 4 ? 1 : 0)) : 0
    rings.forEach((r, i) => {
      const u = MathUtils.clamp((t - i * 0.25) / 1.4, 0, 1)
      // kept drawn (opacity 0) so the shaders compile up front, not mid-spell
      r.current.scale.setScalar(0.3 + u * 7)
      r.current.material.opacity = on && u > 0 && u < 1 ? (1 - u) * 0.9 : 0
      r.current.quaternion.copy(camera.quaternion) // a halo facing us
    })
    motes.current.scale.setScalar(on && t < 4.5 ? 1 : 1e-4)
  })
  return (
    <group position={at}>
      <pointLight ref={light} color={k[0]} intensity={0} distance={18} decay={2} />
      {rings.map((r, i) => (
        <mesh key={i} ref={r}>
          <ringGeometry args={[0.92, 1, 96]} />
          <meshBasicMaterial color={[3, 3.4, 4]} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
      <group ref={motes} scale={1e-4}>
        <Sparkles count={160} scale={[7, 5, 5]} size={9} speed={1.4} color={k[0]} />
        <Sparkles count={60} scale={[3, 3, 3]} size={16} speed={0.6} color="#ffffff" />
      </group>
    </group>
  )
}

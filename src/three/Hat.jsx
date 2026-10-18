import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Sparkles } from '@react-three/drei'
import { MathUtils, Color } from 'three'

// Tripo export, simplified + meshopt-compressed (62 MB → 4 MB) with gltf-transform.
// Native bbox is ~0.98 wide × 0.81 tall with the brim at y = 0.
const SRC = '/hat/sorting-hat.glb'
const HEIGHT = 2.2
const SCALE = HEIGHT / 0.81
useGLTF.preload(SRC)

// mode: 'idle' | 'thinking' | 'speaking'
export function Hat({ mode = 'idle', glow = null }) {
  const { scene } = useGLTF(SRC)
  const rig = useRef()
  const light = useRef()
  const target = useRef(new Color('#f1d27a'))

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const g = rig.current
    let ry = Math.sin(t * 0.3) * 0.35
    let rz = 0
    let sy = 1
    let y = Math.sin(t * 1.2) * 0.03
    if (mode === 'thinking') {
      ry += Math.sin(t * 3.5) * 0.25
      rz = Math.sin(t * 9) * 0.07
      sy = 1 + Math.sin(t * 13) * 0.03
    } else if (mode === 'speaking') {
      sy = 1 + Math.abs(Math.sin(t * 9)) * 0.06
      rz = Math.sin(t * 4.5) * 0.035
      y += Math.abs(Math.sin(t * 9)) * 0.04
    }
    g.rotation.y = MathUtils.damp(g.rotation.y, ry, 6, dt)
    g.rotation.z = MathUtils.damp(g.rotation.z, rz, 10, dt)
    g.scale.y = MathUtils.damp(g.scale.y, sy, 14, dt)
    g.position.y = MathUtils.damp(g.position.y, y, 8, dt)

    const want = glow ? 9 : mode === 'thinking' ? 6 : 0.8
    light.current.intensity = MathUtils.damp(light.current.intensity, want, 4, dt)
    target.current.set(glow ?? '#f1d27a')
    light.current.color.lerp(target.current, 1 - Math.exp(-4 * dt))
  })

  return (
    <group>
      <group ref={rig}>
        <primitive object={scene} scale={SCALE} />
      </group>
      <pointLight ref={light} position={[0, 1.3, 1.6]} distance={8} decay={1.6} intensity={0.8} />
      <Sparkles count={40} scale={[3, 2.6, 3]} position={[0, 1.4, 0]} size={2.5} speed={0.3} color="#f1d27a" />
      {mode === 'thinking' && (
        <Sparkles count={140} scale={[2.6, 3, 2.6]} position={[0, 1.6, 0]} size={5} speed={2.2} color={glow ?? '#ffe7a3'} />
      )}
    </group>
  )
}

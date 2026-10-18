import { useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { MathUtils } from 'three'

// Makes a 3D model feel alive under the mouse: on hover it lifts, grows a touch
// and glows; on click it hops and spins (and onPoke can say a line). The click
// is marked so App doesn't also treat it as "next slide".
export function markPoke() { window.__poked = performance.now() }
export const wasPoked = () => performance.now() - (window.__poked || 0) < 80

const ease = (x) => 1 - Math.pow(1 - x, 3)

// three's raycaster still hits hidden objects; only react to what's on screen
function shown(o) {
  for (; o; o = o.parent) if (!o.visible) return false
  return true
}

export function Interactive({ children, lift = 0.08, grow = 1.05, glow = '#ffe2b8', glowAt = [0, 1.6, 1.2], spin = true, onPoke }) {
  const g = useRef()
  const light = useRef()
  const clock = useThree((s) => s.clock)
  const [hover, setHover] = useState(false)
  const base = useRef({ s: 1, y: 0 })
  const poked = useRef(-10)

  useFrame((_, dt) => {
    const b = base.current
    b.s = MathUtils.damp(b.s, hover ? grow : 1, 10, dt)
    b.y = MathUtils.damp(b.y, hover ? lift : 0, 10, dt)
    const t = clock.elapsedTime - poked.current
    const hop = t < 0.6 ? Math.sin((t / 0.6) * Math.PI) * 0.3 : 0
    g.current.scale.setScalar(b.s)
    g.current.position.y = b.y + hop
    g.current.rotation.y = spin && t < 0.9 ? ease(t / 0.9) * Math.PI * 2 : 0
    light.current.intensity = MathUtils.damp(light.current.intensity, hover ? 5 : 0, 8, dt)
  })

  return (
    <group ref={g}
      onPointerOver={(e) => { if (!shown(e.object)) return; e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}
      onClick={(e) => { if (!shown(e.object)) return; e.stopPropagation(); markPoke(); poked.current = clock.elapsedTime; onPoke?.() }}>
      {children}
      <pointLight ref={light} position={glowAt} color={glow} intensity={0} distance={4} decay={1.5} />
    </group>
  )
}

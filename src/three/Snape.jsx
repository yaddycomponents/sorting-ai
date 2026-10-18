import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { MathUtils, Vector3 } from 'three'

// Tripo bust, simplified + meshopt-compressed (60 MB → 3.7 MB). He already
// holds a raised wand; its tip sits at TIP in model space (found from the mesh).
const SRC = '/snape/snape.glb'
const SCALE = 2.75
const TIP = [0.49, 0.813, 0.121]
const HOME = [-2.35, 0.1, 0.5]
useGLTF.preload(SRC)

// The wand tip in screen pixels, refreshed every frame, for the 2D spell
// effects drawn over the canvas (fluid ink, gesture strokes).
export const wandTip = { x: 0, y: 0, ok: false }
// …and in world space, for 3D effects that start at the wand (the Patronus).
export const wandWorld = new Vector3()

// show: rises in / shrinks away. cast: { key, color } — a new key flicks the wand.
// home / turn / tipOut let him stand elsewhere (the castle gates) and publish his
// wand tip to a different screen-space slot.
export function Snape({ show, cast, home = HOME, turn = -0.22, tipOut = wandTip }) {
  const { scene } = useGLTF(SRC)
  const rig = useRef()
  const tip = useRef()
  const castAt = useRef({ key: null, t: 0 })
  const v = useMemo(() => new Vector3(), [])
  useMemo(() => scene.traverse((o) => { if (o.isMesh) o.castShadow = true }), [scene])

  useFrame(({ clock, camera, size }, dt) => {
    const t = clock.elapsedTime
    const g = rig.current
    if (cast && cast.key !== castAt.current.key) castAt.current = { key: cast.key, t }
    const since = t - castAt.current.t
    // a sharp flick: lean into the cast, then settle
    const flick = castAt.current.key && since < 0.7 ? Math.sin((since / 0.7) * Math.PI) : 0

    g.scale.setScalar(MathUtils.damp(g.scale.x, show ? SCALE : 0.001, 5, dt))
    g.position.y = MathUtils.damp(g.position.y, show ? home[1] + Math.sin(t * 0.9) * 0.03 : -1, 5, dt)
    g.rotation.y = MathUtils.damp(g.rotation.y, turn + Math.sin(t * 0.35) * 0.06 - flick * 0.12, 8, dt)
    g.rotation.z = MathUtils.damp(g.rotation.z, -flick * 0.08, 14, dt)
    g.position.x = MathUtils.damp(g.position.x, home[0] + flick * 0.18, 14, dt)
    g.position.z = home[2]

    tip.current.getWorldPosition(v)
    wandWorld.copy(v)
    v.project(camera)
    tipOut.x = (v.x * 0.5 + 0.5) * size.width
    tipOut.y = (-v.y * 0.5 + 0.5) * size.height
    tipOut.ok = show && g.scale.x > SCALE * 0.9
  })

  const on = show ? 1 : 0
  return (
    <>
      <group ref={rig} position={home} scale={0.001}>
        <primitive object={scene} />
        <group ref={tip} position={TIP}>
          {/* the wand tip glows in the colour of the last spell */}
          <mesh scale={0.012}>
            <sphereGeometry args={[1, 12, 12]} />
            <meshBasicMaterial color={cast?.color ?? '#fff3c4'} toneMapped={false} />
          </mesh>
        </group>
      </group>
      {/* three-point lighting so he reads on any screen: warm key, soft fill, cool rim */}
      <pointLight position={[home[0] + 1.8, 3.3, home[2] + 2.4]} intensity={on * 16} distance={7} decay={1.3} color="#ffe2b8" />
      <pointLight position={[home[0] - 1.6, 2.2, home[2] + 2.2]} intensity={on * 5} distance={6} decay={1.4} color="#b9c3ff" />
      <pointLight position={[home[0] - 0.4, 3.6, home[2] - 1.8]} intensity={on * 14} distance={5} decay={1.2} color="#7f8cff" />
    </>
  )
}

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Object3D } from 'three'

// The user's Tripo candle (68 MB → 4 MB): native 0.37 wide × 0.98 tall, base at y = 0.
const SRC = '/candle.glb'
useGLTF.preload(SRC)
const NATIVE_H = 0.98
const SLIM = 0.65 // the model is a stout pillar; slim it toward a taper candle

const N = 34
const dummy = new Object3D()

// Floating candles of the Great Hall: wax + an unlit-by-tone-mapping flame that blooms.
export function Candles() {
  const { scene } = useGLTF(SRC)
  // one mesh, instanced: bake its node transform (meshopt dequantisation) into the geometry
  const candle = useMemo(() => {
    scene.updateMatrixWorld(true)
    let out = null
    scene.traverse((o) => {
      if (out || !o.isMesh) return
      const geo = o.geometry.clone().applyMatrix4(o.matrixWorld)
      const mat = o.material.clone()
      mat.roughness = 0.65
      mat.metalness = 0
      // wax glows warm from its own flame, so it reads in the dark hall
      mat.color.set('#fff4e0')
      mat.emissive.set('#ffcf8a')
      mat.emissiveMap = mat.map
      mat.emissiveIntensity = 0.55
      out = { geo, mat }
    })
    return out
  }, [scene])
  const wax = useRef()
  const flame = useRef()
  const spots = useMemo(() => Array.from({ length: N }, (_, i) => {
    const r = (k) => {
      const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
      return x - Math.floor(x)
    }
    return { x: -13 + r(1) * 26, y: 4.8 + r(2) * 3.4, z: -15 + r(3) * 11, h: 0.35 + r(4) * 0.3, ph: r(5) * 6.28 }
  }), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    spots.forEach((s, i) => {
      const y = s.y + Math.sin(t * 0.6 + s.ph) * 0.12
      const k = s.h / NATIVE_H
      dummy.position.set(s.x, y - s.h / 2, s.z); dummy.scale.set(k * SLIM, k, k * SLIM); dummy.updateMatrix()
      wax.current.setMatrixAt(i, dummy.matrix)
      const f = 1 + Math.sin(t * 9 + s.ph * 3) * 0.15
      dummy.position.set(s.x, y + s.h / 2 + 0.07, s.z); dummy.scale.set(f, f * 1.5, f); dummy.updateMatrix()
      flame.current.setMatrixAt(i, dummy.matrix)
    })
    wax.current.instanceMatrix.needsUpdate = true
    flame.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={wax} args={[candle.geo, candle.mat, N]} />
      <instancedMesh ref={flame} args={[null, null, N]}>
        <sphereGeometry args={[0.035, 10, 10]} />
        <meshBasicMaterial color={[4, 2.6, 1.1]} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}

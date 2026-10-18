import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, ContactShadows } from '@react-three/drei'
import { CanvasTexture, Color, MathUtils, Object3D, SRGBColorSpace } from 'three'
import { HORIZON, MOON_LIGHT_POS } from './Sky'

// The user's Tripo diorama (56.7 MB → 4.1 MB): a castle on a rock plateau with a
// path, gate posts and trees. Native 0.61 × 0.54 × 0.98, base at y = 0. The whole
// diorama stands on the ground (sunk 0.6 so the rock lip hides the seam), centred.
const SRC = '/castle/castle.glb'
useGLTF.preload(SRC)
const SCALE = 32
export const CASTLE_POS = [0, -0.6, -55]
const TURN = -Math.PI / 2

// Tripo bakes night lighting into the texture and ships a near-mirror roughness
// map (avg 0.12; roughness × map = 0.11). Drop the maps, light it from its own
// bake, push the warm window pixels to HDR so they bloom, and add a cold rim so
// the towers read against the sky.
function nightStone(m) {
  m.roughnessMap = null
  m.metalnessMap = null
  m.roughness = 0.9
  m.metalness = 0
  m.color = new Color('#ffffff')
  m.envMapIntensity = 0.4
  m.emissiveMap = m.map
  m.emissive = new Color('#ffffff')
  m.emissiveIntensity = 1
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', `
      #ifdef USE_MAP
        vec3 bake = texture2D(map, vMapUv).rgb;
        float warm = smoothstep(0.08, 0.25, bake.r - bake.b) * smoothstep(0.25, 0.5, bake.r);
        totalEmissiveRadiance = bake * 0.35 + bake * warm * 6.0;
      #endif
      float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += vec3(0.42, 0.52, 0.85) * rim * 0.6;
    `)
  }
  m.needsUpdate = true
}

export function Castle({ show }) {
  const { scene } = useGLTF(SRC)
  const g = useRef()
  useMemo(() => {
    scene.traverse((o) => {
      if (!o.isMesh || o.userData.stoneSet) return
      nightStone(o.material)
      o.castShadow = true
      o.receiveShadow = true
      o.userData.stoneSet = true
    })
  }, [scene])
  useFrame((_, dt) => {
    const s = MathUtils.damp(g.current.scale.x, show ? SCALE : 0.001, 3, dt)
    g.current.scale.setScalar(s)
    g.current.visible = s > 0.01
  })
  return (
    <>
      <group ref={g} position={CASTLE_POS} rotation={[0, TURN, 0]} scale={0.001}>
        <primitive object={scene} />
      </group>
      {show && (
        <>
          {/* a low mound under the rock, so the diorama sits in land, not on a table */}
          <mesh position={[0, -1.4, CASTLE_POS[2]]} scale={[30, 2.6, 20]} receiveShadow>
            <sphereGeometry args={[1, 48, 24]} />
            <meshStandardMaterial color="#1c2232" roughness={1} />
          </mesh>
          <ContactShadows position={[0, 0.02, CASTLE_POS[2]]} scale={48} blur={3} opacity={0.6} far={20} frames={1} />
        </>
      )}
    </>
  )
}

// Prisoner of Azkaban mood: exponential fog the colour of the horizon, a moon
// that casts shadows, a cold hemisphere fill. `shot` picks the fog density and
// where the moon's shadow camera looks.
const NIGHT = new Color('#07080f')
const AZK = new Color(HORIZON)
const DENSITY = { intro: 0.007, sky: 0.007, gates: 0.014, snape: 0.02, quidditch: 0.02 }
const HALL_DENSITY = 0.045
const FOCUS = { intro: [0, 0, -55], sky: [0, 0, -55], gates: [0, 0, -15] }

export function Mood({ shot }) {
  const dark = shot in DENSITY
  const { scene } = useThree()
  const moon = useRef()
  const hemi = useRef()
  const target = useMemo(() => new Object3D(), [])
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-2.5 * dt)
    if (scene.background?.isColor) scene.background.lerp(dark ? AZK : NIGHT, k)
    if (scene.fog) {
      scene.fog.color.lerp(dark ? AZK : NIGHT, k)
      scene.fog.density = MathUtils.damp(scene.fog.density, DENSITY[shot] ?? HALL_DENSITY, 2.5, dt)
    }
    const f = FOCUS[shot] ?? [0, 0, 0]
    target.position.set(...f)
    moon.current.position.set(f[0] + MOON_LIGHT_POS[0], f[1] + MOON_LIGHT_POS[1], f[2] + MOON_LIGHT_POS[2])
    moon.current.intensity = MathUtils.damp(moon.current.intensity, dark ? 2.5 : 0, 2.5, dt)
    hemi.current.intensity = MathUtils.damp(hemi.current.intensity, dark ? 0.4 : 0, 2.5, dt)
  })
  const size = shot === 'intro' || shot === 'gates' ? 30 : 16
  return (
    <>
      <primitive object={target} />
      <hemisphereLight ref={hemi} args={['#2a3550', '#07080c', 0]} />
      <directionalLight ref={moon} intensity={0} color="#a9bcff" target={target} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} shadow-normalBias={0.02}
        shadow-camera-left={-size} shadow-camera-right={size} shadow-camera-top={size} shadow-camera-bottom={-size}
        shadow-camera-near={1} shadow-camera-far={160} />
      {dark && <Mist />}
    </>
  )
}

// A soft radial sprite, reused by every mist plane.
function useMistTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const g = c.getContext('2d')
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    r.addColorStop(0, 'rgba(200,215,255,0.55)')
    r.addColorStop(1, 'rgba(200,215,255,0)')
    g.fillStyle = r
    g.fillRect(0, 0, 128, 128)
    const tex = new CanvasTexture(c)
    tex.colorSpace = SRGBColorSpace
    return tex
  }, [])
}

// Low mist round the castle's base: few, large, faint puffs, kept above the
// ground so their edges never cut into geometry.
function Mist() {
  const tex = useMistTexture()
  const puffs = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const r = (k) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x) }
    const s = 12 + r(4) * 10
    return { x: -24 + r(1) * 48, y: s * 0.5 * 0.35 + 0.2, z: -72 + r(3) * 34, s, v: 0.12 + r(5) * 0.2, o: 0.05 + r(6) * 0.05 }
  }), [])
  const refs = useRef([])
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime
    refs.current.forEach((m, i) => {
      if (!m) return
      const p = puffs[i]
      m.position.x = ((p.x + t * p.v + 24) % 48) - 24 // drift sideways, wrap around
      m.quaternion.copy(camera.quaternion) // always face the camera
    })
  })
  return puffs.map((p, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[p.x, p.y, p.z]} scale={[p.s, p.s * 0.35, 1]} renderOrder={-1}>
      <planeGeometry />
      <meshBasicMaterial map={tex} transparent opacity={p.o} depthWrite={false} fog={false} />
    </mesh>
  ))
}

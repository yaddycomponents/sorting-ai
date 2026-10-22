import { Suspense, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, MeshReflectorMaterial, Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, HueSaturation, BrightnessContrast, GodRays, N8AO, SMAA } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Color, MathUtils, Object3D, Vector3 } from 'three'
import { Hat } from './Hat'
import { Banner } from './Banner'
import { Candles } from './Candles'
import { Snape } from './Snape'
import { Quidditch } from './Quidditch'
import { Gates, HAT_Z, SNAPE_HOME, gatePoint, fx as gateFx } from './Gates'
import { PatronusBurst } from './PatronusBurst'
import { LiveStage } from './LiveStage'
import { Interactive } from './Interactive'
import { Castle, Mood } from './Castle'
import { Patronus } from './Patronus'
import { SPELLS } from '../spells'
import { Ground } from './Ground'
import { NightSky, Hills, Moon, SkyClouds } from './Sky'
import { houses, order, hall as t } from '../theme'

const SHOTS = {
  title: { pos: [0, 2.2, 10.4], look: [0, 1.4, 0] },
  live: { pos: [0, 2.3, 9.2], look: [0, 1.35, 0] }, // the Hat centred, brim clear of the bottom
  fin: { pos: [0, 2.0, 7.6], look: [0, 1.4, 0] },
  snape: { pos: [-0.3, 2.6, 7.4], look: [-0.3, 2.35, 0] },
  quidditch: { pos: [0, 2.7, 12.6], look: [0, 2.35, 0] },
  // lower and a touch off-axis: the path runs diagonally into the fog
  // three-quarter view along the path: all nine gates in a line, the Hat at the end
  gates: { pos: [19, 7, 9], look: [-1, 1.2, -14.5], fov: 33 },
  // the whole diorama, ~53 units away, with sky above it for the moon
  // hero crop: low and close, looking up; the castle on the right third,
  // the diorama's cut edges out of frame or under the title
  intro: { pos: [-5, 3.2, -24], look: [3.5, 10.5, -55], fov: 30, sway: true },
  // behind the scroll slides: the same spot, tilted up into the moonlit sky
  sky: { pos: [-5, 3.2, -24], look: [-3, 26, -80], fov: 38, sway: true },
}

const ROW = [-4.5, -1.5, 1.5, 4.5]
const HIDDEN = (i) => [ROW[i], 11, -3.4]

// The plain slides cover the hall; keep it on the title shot behind them.
const shotFor = (scene) => SHOTS[shotName(scene)] ?? SHOTS.title
// Prisoner of Azkaban mood for the castle scenes
// The moonlit night is the backdrop for everything except the Hat's own scenes,
// which stay in the warm Great Hall.
const HALL = ['title', 'live', 'fin']
const PLAIN = ['pipeline', 'houses', 'doors'] // scroll slides: they float over the sky
const isDark = (scene) => !HALL.includes(scene)
const shotName = (scene) => (PLAIN.includes(scene) ? 'sky' : scene)

// Camera glides to the shot; a soft spotlight follows whatever it looks at.
function Rig({ shot, cold }) {
  const look = useRef(new Vector3(...SHOTS.title.look))
  const spot = useRef()
  const target = useMemo(() => new Object3D(), [])
  const warm = useMemo(() => new Color('#ffd9a0'), [])
  const ice = useMemo(() => new Color('#9db2ff'), [])
  useFrame(({ camera, clock }, dt) => {
    // the intro drifts slowly, like a crane shot over the grounds
    const t = clock.elapsedTime
    const sway = shot.sway ? [Math.sin(t * 0.12) * 0.8, Math.sin(t * 0.09) * 0.25, Math.cos(t * 0.12) * 0.6] : [0, 0, 0]
    for (const [i, k] of ['x', 'y', 'z'].entries()) {
      camera.position[k] = MathUtils.damp(camera.position[k], shot.pos[i] + sway[i], 2, dt)
      look.current[k] = MathUtils.damp(look.current[k], shot.look[i], 2, dt)
    }
    camera.lookAt(look.current)
    const fov = MathUtils.damp(camera.fov, shot.fov ?? 40, 2, dt)
    if (Math.abs(fov - camera.fov) > 1e-3) { camera.fov = fov; camera.updateProjectionMatrix() }
    target.position.copy(look.current)
    spot.current.position.set(look.current.x + 1.5, 7.5, look.current.z + 4)
    spot.current.color.lerp(cold ? ice : warm, 1 - Math.exp(-2.5 * dt))
    // off in the night scenes: there it would sit inside the castle
    spot.current.intensity = MathUtils.damp(spot.current.intensity, cold ? 0 : 70, 2.5, dt)
  })
  return (
    <>
      <primitive object={target} />
      <spotLight ref={spot} target={target} angle={0.42} penumbra={1} intensity={38} color="#ffd9a0" />
    </>
  )
}

// Where each banner hangs and how bright, per scene.
function bannerState(scene, sort, hatSorted) {
  return order.map((k, i) => {
    // easter egg: the Hat sorts the presenter, so the Slytherin banner drops behind it
    if (hatSorted && HALL.includes(scene)) return k === 'slytherin' ? { to: [0, 4.05, -2.2], lit: 1 } : { to: HIDDEN(i), lit: 0 }
    const home = [ROW[i], 3.75, -3.4]
    if (scene === 'snape' || scene === 'quidditch' || scene === 'gates' || scene === 'intro') return { to: HIDDEN(i), lit: 0 }
    if (scene === 'live') {
      if (sort.phase === 'decided' && sort.res.house === k) return { to: [0, 4.05, -2.2], lit: 1 }
      return { to: HIDDEN(i), lit: 0 }
    }
    return { to: home, lit: scene === 'fin' ? 0.6 : 0.3 }
  })
}

function hatMode(scene, sort, gate) {
  if (scene === 'gates') return gate?.awake ? 'speaking' : 'idle'
  if (scene === 'live') return sort.phase === 'thinking' ? 'thinking' : sort.phase === 'decided' ? 'speaking' : 'idle'
  return 'idle'
}

function hatGlow(scene, sort, gate) {
  if (scene === 'gates' && gate?.awake) return '#ffd27a'
  if (scene === 'live' && sort.phase === 'decided') return houses[sort.res.house].glow
  return null
}


function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[60, 60]} />
      <MeshReflectorMaterial resolution={512} mirror={0.5} mixBlur={6} mixStrength={1.4} blur={[300, 80]}
        roughness={0.9} depthScale={1} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#0b0c16" metalness={0.5} />
    </mesh>
  )
}

// A dark rock in the near left of the gates shot: foreground depth.
function ForegroundRock() {
  return (
    <mesh position={[-4.6, 0.3, 4.5]} scale={[1.6, 1.1, 1.2]} rotation={[0.3, 0.6, 0.2]} castShadow>
      <dodecahedronGeometry args={[1, 1]} />
      <meshStandardMaterial color="#141820" roughness={1} flatShading />
    </mesh>
  )
}

export default function World({ scene, sort, cast, quid, gate, onSnapePoke, onHatPoke, hatSorted }) {
  const banners = bannerState(scene, sort, hatSorted)
  const phases = useMemo(() => order.map((_, i) => i * 1.7), [])

  const dark = isDark(scene)
  const [moon, setMoon] = useState(null)

  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: SHOTS.title.pos, fov: 40 }} gl={{ antialias: false }} style={{ position: 'fixed', inset: 0 }}>
      <color attach="background" args={[t.night]} />
      <fogExp2 attach="fog" args={[t.night, 0.045]} />
      {/* the warm hall's own light; the night scenes use Mood's hemisphere + moon */}
      <ambientLight intensity={dark ? 0 : 0.5} color="#8a90c0" />
      <directionalLight position={[-5, 4, -2]} intensity={dark ? 0 : 0.65} color="#6f86ff" />
      {/* warm key on the Hat from the front-right, so it never sinks into the dark */}
      <pointLight position={[2.2, 3.4, 3.6]} intensity={dark ? 0 : 22} distance={10} decay={1.6} color="#ffd9a0" />

      <Rig shot={shotFor(scene)} cold={dark} />
      <Mood shot={shotName(scene)} />
      {!dark && <Stars radius={70} depth={30} count={2200} factor={3} fade speed={0.4} />}
      {/* no floating candles out on the dark grounds */}
      <Suspense fallback={null}><group visible={!dark}><Candles /></group></Suspense>
      {dark ? (
        <Suspense fallback={null}>
          {/* the HDRI only lights the models; the visible sky is our own night dome */}
          <Environment files="/env/night_sky.hdr" environmentIntensity={0.25} />
          <NightSky />
          <Moon ref={setMoon} />
          <SkyClouds />
          <Hills />
          <Ground path={scene === 'gates'} />
          {scene === 'gates' && <ForegroundRock />}
        </Suspense>
      ) : <Floor />}

      {order.map((k, i) => <Banner key={k} house={k} to={banners[i].to} lit={banners[i].lit} phase={phases[i]} />)}

      <Suspense fallback={null}>
        {/* the Hat steps aside while Snape teaches the spells */}
        {/* in the gates scene the Hat waits at the far end of the corridor */}
        {/* the castle is the intro's subject; the gates scene ends at the Hat */}
        {/* the castle is scenery: it doesn't react to the mouse (the intro click starts the music) */}
        <Castle show={scene === 'intro' || PLAIN.includes(scene)} />
        <group visible={scene !== 'snape' && scene !== 'quidditch' && scene !== 'intro'} position={[0, 0, scene === 'gates' ? HAT_Z : 0]} scale={scene === 'gates' ? 1.7 : 1}>
          <Interactive glowAt={[0, 2.2, 1.4]} onPoke={onHatPoke}>
            <Hat mode={hatMode(scene, sort, gate)} glow={hatGlow(scene, sort, gate)} />
          </Interactive>
        </group>
        {/* one Snape model: the lesson on the left, or the gates where he answers Ron */}
        <Interactive onPoke={onSnapePoke} spin={false} lift={0.05} grow={1.03} glow="#b9c3ff" glowAt={[scene === 'gates' ? SNAPE_HOME[0] + 1 : -1.4, 2.6, 2.4]}>
          {scene === 'gates'
            ? <Snape show cast={gate?.snapeCast} home={SNAPE_HOME} turn={1.1} tipOut={gateFx.snape} />
            : <Snape show={scene === 'snape'} cast={scene === 'snape' ? cast : null} />}
        </Interactive>
      </Suspense>

      {scene === 'live' && <Suspense fallback={null}><LiveStage sort={sort} /></Suspense>}
      {/* Expecto Patronum: Snape's doe charges the Dementors after a turn-away */}
      {scene === 'gates' && gate && (() => {
        const at = gatePoint(Math.max(0, gate.states.findIndex((x) => x === 'fail')))
        return (
          <>
            <Patronus cast={gate.expecto ? { key: gate.expecto.key, patronus: '🦌', color: '#dce8ff' } : null} center={at} size={3.4} hold={4} publish={false} />
            <PatronusBurst at={at} trigger={gate.expecto?.key ?? null} />
          </>
        )
      })()}
      {scene === 'snape' && <Patronus cast={cast ? { key: cast.key, patronus: SPELLS[cast.i].patronus, color: cast.color } : null} />}
      {scene === 'gates' && gate && <Suspense fallback={null}><Gates run={gate.run} states={gate.states} onPass={gate.onPass} onStop={gate.onStop} onDone={gate.onDone} repel={gate.expecto?.key} /></Suspense>}
      {scene === 'quidditch' && quid && <Quidditch run={quid.run} states={quid.states} onPass={quid.onPass} onFail={quid.onFail} onDone={quid.onDone} />}

      {/* order matters: AO and bloom on HDR values, god rays, then tone mapping
          (the composer disables the renderer's own), then the grade on top */}
      <EffectComposer multisampling={0} autoClear={false}>
        {dark ? <N8AO halfRes aoRadius={0.8} intensity={2.5} distanceFalloff={1} /> : <></>}
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={1.0} luminanceSmoothing={0.15} />
        {dark && moon ? <GodRays sun={moon} samples={40} density={0.94} decay={0.92} weight={0.3} exposure={0.4} blur /> : <></>}
        <ToneMapping mode={ToneMappingMode.AGX} />
        {/* Azkaban grade: desaturated, a little contrast */}
        {dark ? <HueSaturation saturation={-0.25} /> : <></>}
        {dark ? <BrightnessContrast contrast={0.12} brightness={-0.03} /> : <></>}
        <Vignette eskil={false} offset={0.3} darkness={0.55} />
        <Noise premultiply={false} blendFunction={BlendFunction.OVERLAY} opacity={0.06} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}

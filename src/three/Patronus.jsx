import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, PointsMaterial, Vector3 } from 'three'
import { silhouette } from '../patronusShape'
import { playSfx } from '../voice'

// The Patronus: the end of every spell in Snape's lesson. The ink lands at
// CENTER and erupts into a 3D point cloud of the spell's animal (like Tripo's
// generating preview, or Pottermore's Patronus), glows silver-blue via bloom,
// shimmers, scatters away from the mouse, then dissolves upward as the card
// arrives.
const N = 5200
const CENTER = new Vector3(-0.5, 2.5, 0.6) // between Snape's wand and the card
const SIZE = 2.2
const START = 1.1 // s after the cast: when the ink lands
// it stays beside the card until the next spell (no dissolve)
const HOLD = 1e4

// Where the ink should land, in screen pixels (refreshed every frame).
export const patronusScreen = { x: 0, y: 0 }

// The mouse in normalised device coords, from the window, since the HTML
// overlays sit on top of the canvas and swallow its pointer events.
const mouseNdc = { x: 9, y: 9 }
if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    mouseNdc.x = (e.clientX / innerWidth) * 2 - 1
    mouseNdc.y = -(e.clientY / innerHeight) * 2 + 1
  })
}

// Built on PointsMaterial (patched via onBeforeCompile) so three supplies all
// its own uniforms and defines; a bare ShaderMaterial rendered nothing here.
const VERT_HEAD = `
  attribute vec3 aTarget;
  attribute float aSeed;
  uniform float uT;
  uniform vec3 uCenter;
  uniform vec3 uMouse;
  uniform float uHold;
  varying float vA;
  varying float vTw;
`
const VERT_MOVE = `
  float delay = aSeed * 0.5;
  float k = clamp((uT - delay) / 1.0, 0.0, 1.0);
  k = 1.0 - pow(1.0 - k, 3.0);
  vec3 p = mix(uCenter, aTarget, k);
  // swirl out of the ink, settling into a gentle shimmer
  float sw = 1.0 - k;
  p += vec3(sin(uT * 3.0 + aSeed * 40.0), cos(uT * 2.6 + aSeed * 31.0), sin(uT * 2.2 + aSeed * 17.0)) * (0.55 * sw + 0.025);
  // dissolve: drift up and apart, like a Patronus fading
  float d = clamp((uT - uHold) / 1.3, 0.0, 1.0);
  p += vec3((aSeed - 0.5) * 1.6, 1.8, fract(aSeed * 7.0) - 0.5) * d * d;
  // brush through it with the mouse: particles part around the pointer
  vec2 m = p.xy - uMouse.xy;
  p.xy += normalize(m + 1e-4) * max(0.0, 0.9 - length(m)) * 1.3 * k * (1.0 - d); // a wider, stronger part
  vA = step(delay, uT) * clamp((uT - delay) / 0.2, 0.0, 1.0) * (1.0 - d);
  vTw = 0.65 + 0.35 * sin(uT * 8.0 + aSeed * 60.0);
  vec3 transformed = p;
`
const FRAG_HEAD = `
  uniform vec3 uColor;
  varying float vA;
  varying float vTw;
`
// a soft round sprite in HDR silver-blue (above 1, so bloom makes it glow)
const FRAG_COLOR = `
  float r = length(gl_PointCoord - 0.5);
  float spot = 1.0 - smoothstep(0.0, 0.5, r);
  // the spell's colour with a silver core, HDR so bloom makes it glow
  vec3 col = mix(vec3(2.4), uColor * 3.2, 0.6 + 0.4 * r * 2.0);
  gl_FragColor = vec4(col * vTw * spot * vA, spot * vA);
`

function patronusMaterial(uniforms) {
  const m = new PointsMaterial({ size: 0.075, sizeAttenuation: true, transparent: true, depthWrite: false, blending: AdditiveBlending })
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms)
    sh.vertexShader = VERT_HEAD + sh.vertexShader
      .replace('#include <begin_vertex>', VERT_MOVE)
      .replace('gl_PointSize = size;', 'gl_PointSize = size * (0.6 + aSeed * 1.2);')
    sh.fragmentShader = FRAG_HEAD + sh.fragmentShader
      .replace('#include <opaque_fragment>', FRAG_COLOR)
  }
  return m
}

// cast: { key, patronus } — the glyph whose silhouette the Patronus takes.
// center/size: where and how big; hold: seconds before it dissolves (default:
// stays); publish: whether it sets patronusScreen (the spell ink aims there)
export function Patronus({ cast, center = CENTER, size: SZ = SIZE, hold = HOLD, publish = true }) {
  const pts = useRef()
  const t0 = useRef(null)
  const chimed = useRef(null)
  const mouse = useMemo(() => new Vector3(), [])
  const v = useMemo(() => new Vector3(), [])

  const geo = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aTarget', new BufferAttribute(new Float32Array(N * 3), 3))
    const seed = new Float32Array(N)
    for (let i = 0; i < N; i++) seed[i] = Math.random()
    g.setAttribute('aSeed', new BufferAttribute(seed, 1))
    return g
  }, [])

  const uniforms = useMemo(() => ({ uT: { value: -1 }, uCenter: { value: new Vector3() }, uMouse: { value: mouse }, uColor: { value: new Color('#b8d4ff') }, uHold: { value: hold } }), [mouse, hold])
  const material = useMemo(() => patronusMaterial(uniforms), [uniforms])

  // a new cast reshapes the cloud into that spell's animal
  useEffect(() => {
    if (!cast) return
    uniforms.uColor.value.set(cast.color ?? '#b8d4ff')
    const c = uniforms.uCenter.value.set(...(Array.isArray(center) ? center : center.toArray()))
    const sil = silhouette(cast.patronus)
    if (!sil.length) return
    const tg = geo.attributes.aTarget.array
    for (let i = 0; i < N; i++) {
      const [x, y] = sil[(i * 7919) % sil.length]
      tg[i * 3] = c.x + x * SZ + (Math.random() - 0.5) * 0.02
      tg[i * 3 + 1] = c.y + y * SZ + (Math.random() - 0.5) * 0.02
      tg[i * 3 + 2] = c.z + (Math.random() - 0.5) * SZ * 0.28 // volume, not a flat cut-out
    }
    geo.attributes.aTarget.needsUpdate = true
    t0.current = null
  }, [cast, geo, uniforms])

  useFrame(({ clock, camera, size }) => {
    if (publish) v.copy(uniforms.uCenter.value).project(camera)
    if (publish) patronusScreen.x = (v.x * 0.5 + 0.5) * size.width
    if (publish) patronusScreen.y = (-v.y * 0.5 + 0.5) * size.height
    // no cast: stay drawn but fully transparent (uT < 0), so the shader is compiled before the first spell
    if (!cast) { uniforms.uT.value = -1; pts.current.visible = true; return }
    if (t0.current === null) t0.current = clock.elapsedTime + START
    // window.__patronusFreeze pins the clock (for screenshot checks on slow renderers)
    const t = window.__patronusFreeze ?? clock.elapsedTime - t0.current
    uniforms.uT.value = t
    pts.current.visible = t < hold + 1.4
    // the charm's shimmer as it bursts out of the ink (public/patronus.mp3)
    if (t > 0 && chimed.current !== cast.key) { chimed.current = cast.key; playSfx('patronus') }
    // the mouse, projected onto the Patronus's plane
    v.set(mouseNdc.x, mouseNdc.y, 0.5).unproject(camera).sub(camera.position).normalize()
    const s = (uniforms.uCenter.value.z - camera.position.z) / v.z
    mouse.copy(camera.position).addScaledVector(v, s)
  })

  return (
    <points ref={pts} geometry={geo} material={material} frustumCulled={false} visible={false} />
  )
}

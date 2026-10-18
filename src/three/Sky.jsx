import { forwardRef, useMemo } from 'react'
import { Clouds, Cloud } from '@react-three/drei'
import { BackSide, BufferGeometry, Float32BufferAttribute, Color, MeshLambertMaterial, Vector3 } from 'three'

// The night for the castle scenes (see docs/research-3d-look.md): a gradient dome
// with stars and a moon glow, a real moon disc (a mesh, so god rays can use it),
// two layers of hill silhouettes, and a thin cloud band across the moon.
export const HORIZON = '#2b3652'
const ZENITH = '#03050c'
// upper-left of the intro frame, just behind the castle's left towers
const MOON_DIR = new Vector3(-0.05, 0.36, -0.93).normalize()
const MOON_R = 0.0157 // angular radius: 0.9° → a 1.8° disc (the real moon is 0.5°; film moons run large)
const MOON_DIST = 350

const vert = `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`
const frag = `
  uniform vec3 uZenith, uHorizon, uMoonDir;
  uniform float uMoonR;
  varying vec3 vDir;
  float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
  void main() {
    vec3 d = normalize(vDir);
    float h = clamp(d.y, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(h, 0.45));
    // glow round the moon, sized from the disc (the disc itself is a mesh)
    float ang = sqrt(max(2.0 * (1.0 - dot(d, uMoonDir)), 0.0));
    col += vec3(0.35, 0.42, 0.62) * exp(-ang / (uMoonR * 2.5)) * 0.6;
    col += vec3(0.10, 0.13, 0.22) * exp(-ang / 0.25) * 0.5;
    // stars, fading out toward the misty horizon and near the moon
    vec3 cell = floor(d * 520.0);
    float s = step(0.9982, hash(cell)) * smoothstep(0.05, 0.35, h) * smoothstep(0.08, 0.3, ang);
    col += vec3(s) * (0.35 + 0.65 * hash(cell + 1.0));
    gl_FragColor = vec4(col, 1.0);
  }`

export function NightSky() {
  const uniforms = useMemo(() => ({
    uZenith: { value: new Color(ZENITH) },
    uHorizon: { value: new Color(HORIZON) },
    uMoonDir: { value: MOON_DIR },
    uMoonR: { value: MOON_R },
  }), [])
  return (
    <mesh scale={400} renderOrder={-2}>
      <sphereGeometry args={[1, 48, 24]} />
      <shaderMaterial vertexShader={vert} fragmentShader={frag} uniforms={uniforms} side={BackSide} depthWrite={false} fog={false} />
    </mesh>
  )
}

// The moon disc: HDR white, so tone mapping keeps it white and bloom gives it a
// soft edge. GodRays reads it as the light source.
export const Moon = forwardRef(function Moon(_, ref) {
  const pos = MOON_DIR.clone().multiplyScalar(MOON_DIST)
  return (
    <mesh ref={ref} position={pos} scale={MOON_DIST * Math.tan(MOON_R)}>
      <sphereGeometry args={[1, 32, 16]} />
      <meshBasicMaterial color={[4.5, 4.6, 5]} toneMapped transparent depthWrite={false} fog={false} />
    </mesh>
  )
})

// A ring of hills: a black silhouette against the sky (no fog, or it vanishes).
function ring(R, base, amp, seed) {
  const N = 180
  const pos = []
  const height = (a) => base + Math.sin(a * 3 + seed) * amp + Math.sin(a * 7 + 1 + seed) * amp * 0.6 + Math.sin(a * 17 + 2 + seed) * amp * 0.25
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2
    const a1 = ((i + 1) / N) * Math.PI * 2
    const p = (a, y) => [Math.cos(a) * R, y, Math.sin(a) * R]
    const [b0, t0, b1, t1] = [p(a0, -1), p(a0, height(a0)), p(a1, -1), p(a1, height(a1))]
    pos.push(...b0, ...t0, ...b1, ...b1, ...t0, ...t1)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  return g
}

export function Hills() {
  const near = useMemo(() => ring(110, 4, 2.5, 0), [])
  const far = useMemo(() => ring(160, 9, 4, 2.3), [])
  return (
    <group position={[0, 0, -30]}>
      {/* two layers for depth: the far ridge lighter, the near one darker */}
      <mesh geometry={far}>
        <meshBasicMaterial color="#141a2a" side={2} fog={false} />
      </mesh>
      <mesh geometry={near}>
        <meshBasicMaterial color="#0a0d16" side={2} fog={false} />
      </mesh>
    </group>
  )
}

// Clouds drifting past the moon; far beyond the fog, so they opt out of it.
class SkyCloudMaterial extends MeshLambertMaterial {
  constructor(p) { super(p); this.fog = false }
}
export function SkyClouds() {
  const at = MOON_DIR.clone().multiplyScalar(260)
  return (
    <Clouds material={SkyCloudMaterial} limit={200}>
      <Cloud segments={30} bounds={[70, 6, 10]} volume={22} color="#3a4560" opacity={0.2} speed={0.05} fade={200}
        position={[at.x + 25, at.y - 8, at.z]} />
    </Clouds>
  )
}

// The moonlight, matching the moon's place in the sky.
export const MOON_LIGHT_POS = MOON_DIR.toArray().map((v) => v * 60)

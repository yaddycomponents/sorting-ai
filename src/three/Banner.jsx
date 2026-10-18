import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, DoubleSide, MathUtils, PlaneGeometry, SRGBColorSpace } from 'three'
import { houses } from '../theme'

const W = 1.5
const H = 2.9
const SEG_X = 14
const SEG_Y = 28

// Fabric banner: house colours, trim, the crest, the name; swallowtail hem.
async function paint(h) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 1024
  const g = c.getContext('2d')
  await document.fonts.load('700 60px Cinzel')
  const crest = new Image()
  crest.src = h.crest
  await crest.decode()

  const notch = 120
  const shape = () => {
    g.beginPath()
    g.moveTo(0, 0); g.lineTo(512, 0); g.lineTo(512, 1024)
    g.lineTo(256, 1024 - notch); g.lineTo(0, 1024); g.closePath()
  }

  // cloth
  shape()
  const fill = g.createLinearGradient(0, 0, 512, 0)
  fill.addColorStop(0, shade(h.main, 0.6)); fill.addColorStop(0.5, h.main); fill.addColorStop(1, shade(h.main, 0.6))
  g.fillStyle = fill
  g.fill()

  // woven texture
  g.save(); shape(); g.clip()
  g.globalAlpha = 0.06
  for (let y = 0; y < 1024; y += 4) { g.fillStyle = y % 8 ? '#000' : '#fff'; g.fillRect(0, y, 512, 1) }
  g.restore()

  // trim
  g.save(); shape(); g.clip()
  g.lineWidth = 34; g.strokeStyle = h.trim; shape(); g.stroke()
  g.lineWidth = 4; g.strokeStyle = shade(h.trim, 0.55)
  g.beginPath(); g.moveTo(30, 0); g.lineTo(30, 1024 - 40); g.moveTo(482, 0); g.lineTo(482, 1024 - 40); g.stroke()
  g.restore()

  // crest
  const cw = 330
  const ch = cw * (crest.height / crest.width)
  g.shadowColor = 'rgba(0,0,0,0.5)'; g.shadowBlur = 24; g.shadowOffsetY = 8
  g.drawImage(crest, 256 - cw / 2, 120, cw, ch)
  g.shadowColor = 'transparent'

  // name
  g.fillStyle = h.trim
  g.font = '700 58px Cinzel'
  g.textAlign = 'center'
  g.fillText(h.name.toUpperCase(), 256, 120 + ch + 90)

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const k = (v) => Math.round(v * f)
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`
}

// house: key; to: [x,y,z] target position; lit: 0..1 brightness
export function Banner({ house, to, lit = 0.3, phase = 0 }) {
  const h = houses[house]
  const [tex, setTex] = useState(null)
  const group = useRef()
  const mat = useRef()
  const geo = useMemo(() => new PlaneGeometry(W, H, SEG_X, SEG_Y), [])
  const rest = useMemo(() => Float32Array.from(geo.attributes.position.array), [geo])

  useEffect(() => { let live = true; paint(h).then((x) => live && setTex(x)); return () => { live = false } }, [h])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime + phase
    // cloth: pinned at the rod, ripples grow toward the hem
    const p = geo.attributes.position
    for (let i = 0; i < p.count; i++) {
      const x = rest[i * 3]
      const y = rest[i * 3 + 1]
      const free = (H / 2 - y) / H
      p.array[i * 3 + 2] = (Math.sin(x * 2.4 + t * 1.6) * 0.07 + Math.sin(y * 1.8 + t * 1.1) * 0.05) * free
    }
    p.needsUpdate = true
    geo.computeVertexNormals()

    const g = group.current
    g.position.x = MathUtils.damp(g.position.x, to[0], 3, dt)
    g.position.y = MathUtils.damp(g.position.y, to[1], 3, dt)
    g.position.z = MathUtils.damp(g.position.z, to[2], 3, dt)
    if (mat.current) mat.current.emissiveIntensity = MathUtils.damp(mat.current.emissiveIntensity, 0.08 + lit * 0.75, 4, dt)
  })

  return (
    <group ref={group} position={[to[0], to[1] + 6, to[2]]}>
      {/* rod + finials */}
      <mesh position={[0, H / 2 + 0.04, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.035, 0.035, W + 0.35, 12]} />
        <meshStandardMaterial color="#b8892b" metalness={0.9} roughness={0.3} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (W / 2 + 0.2), H / 2 + 0.04, 0]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.25} />
        </mesh>
      ))}
      {tex && (
        <mesh geometry={geo}>
          <meshStandardMaterial ref={mat} map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.1}
            roughness={0.85} side={DoubleSide} transparent alphaTest={0.4} />
        </mesh>
      )}
    </group>
  )
}

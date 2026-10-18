// The silhouette a Patronus takes, sampled from a glyph's alpha (the glyph is
// never shown). Returns points in a unit box, x mirrored so it faces the card.
const cache = new Map()
export function silhouette(glyph) {
  if (cache.has(glyph)) return cache.get(glyph)
  const S = 240
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d', { willReadFrequently: true })
  g.font = `${S * 0.82}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(glyph, S / 2, S / 2 + S * 0.04)
  const d = g.getImageData(0, 0, S, S).data
  const pts = []
  for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) {
    if (d[(y * S + x) * 4 + 3] > 120) pts.push([-(x / S - 0.5), -(y / S - 0.5)])
  }
  cache.set(glyph, pts)
  return pts
}

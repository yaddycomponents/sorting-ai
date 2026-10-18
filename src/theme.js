// Design system modelled on harrypotter.com: a display serif for headings in
// sentence case (theirs is Harry Beast; Fraunces is the closest free match),
// a geometric sans for everything else (theirs is Sofia Pro; Outfit), flat deep
// backgrounds, warm off-white text, one bright accent per house.
// Crests come from the Harry Potter Wiki (public/crests/SOURCE.txt): internal demo only.

export const t = {
  night: '#13101a',
  bg: '#13101a',
  surface: 'rgba(249,244,242,0.045)',
  surfaceHi: 'rgba(249,244,242,0.08)',
  line: 'rgba(249,244,242,0.12)',

  ink: '#f9f4f2',
  muted: 'rgba(249,244,242,0.64)',
  faint: 'rgba(249,244,242,0.40)',
  accent: '#ebab38',

  paper: '#f9f4f2',
  paperInk: '#13101a',
  paperMuted: 'rgba(19,16,26,0.55)',
  paperLine: 'rgba(19,16,26,0.14)',
  wax: '#9b2226',

  serif: "'Fraunces', Georgia, serif",
  sans: "'Outfit', 'Helvetica Neue', Helvetica, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

// The 3D side (title, live demo, fin) keeps the original Great Hall look:
// Cinzel + Cormorant, candle gold, parchment letters.
export const hall = {
  night: '#07080f',
  ink: '#f3ead2',
  muted: '#a9a28d',
  faint: '#6d6a60',
  gold: '#d4af37',
  goldBright: '#f1d27a',
  goldGrad: 'linear-gradient(100deg, #b8892b 0%, #f1d27a 45%, #c99a32 100%)',
  line: 'rgba(212,175,55,0.22)',
  parchment: '#efe3c4',
  parchmentDeep: '#dcc89a',
  parchmentInk: '#3a2a18',
  parchmentMuted: '#7a6448',
  wax: '#8e1b1b',

  display: "'Cinzel', Georgia, serif",
  decorative: "'Cinzel Decorative', 'Cinzel', Georgia, serif",
  serif: "'Cormorant Garamond', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
}

// Small uppercase label, the site's signature detail.
export const label = { fontFamily: t.sans, fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }

// Section heading: serif, regular weight, sentence case, tight leading.
export const heading = { fontFamily: t.serif, fontWeight: 400, lineHeight: 1.05, letterSpacing: '-0.01em', color: t.ink }

export const houses = {
  gryffindor: {
    name: 'Gryffindor', crest: '/crests/gryffindor.webp',
    main: '#740001', trim: '#d3a625', glow: '#fd7366',
    status: 'SENT', does: 'Replied to the customer',
  },
  hufflepuff: {
    name: 'Hufflepuff', crest: '/crests/hufflepuff.webp',
    main: '#e0a915', trim: '#2b2420', glow: '#fdc055',
    status: 'ACTIONED', does: 'Created a PTP or dispute, no reply',
  },
  ravenclaw: {
    name: 'Ravenclaw', crest: '/crests/ravenclaw.webp',
    main: '#0e1a40', trim: '#946b2d', glow: '#4f8ff0',
    status: 'ABSTAINED', does: 'Left for a human',
  },
  slytherin: {
    name: 'Slytherin', crest: '/crests/slytherin.webp',
    main: '#1a472a', trim: '#aaaaaa', glow: '#2fb39d',
    status: 'DROPPED', does: 'Ignored as negligible',
  },
}

export const order = ['gryffindor', 'hufflepuff', 'ravenclaw', 'slytherin']

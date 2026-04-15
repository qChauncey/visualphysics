// ─────────────────────────────────────────────
//  Module: Feynman Diagrams
//  Renderer: Canvas 2D
// ─────────────────────────────────────────────
//
//  Animated Feynman diagrams for four QED processes.
//  Each diagram is defined as a data structure; the rendering helpers
//  are generic (fermion lines, photon wiggles, vertices).

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Diagram data types ────────────────────────────────────────────────────

type LineType = 'fermion' | 'photon' | 'z-boson' | 'gluon'
type ArrowDir = 'forward' | 'backward' | 'none'

type Particle = {
  from:    [number, number]   // normalised coords [0..1]
  to:      [number, number]
  type:    LineType
  label:   string
  labelEn: string
  arrow:   ArrowDir
  tStart:  number             // animation progress when line starts drawing
  tEnd:    number             // animation progress when line finishes
  faded?:  boolean            // for internal propagators
}

type Vertex = {
  pos: [number, number]
  t:   number                 // animT threshold when vertex lights up
}

type DiagramDef = {
  id:       string
  label:    string
  labelEn:  string
  particles: Particle[]
  vertices:  Vertex[]
  descZh:   string
  descEn:   string
}

// ── Diagram definitions ───────────────────────────────────────────────────

const DIAGRAMS: DiagramDef[] = [
  // ── 0: e+e- → γγ (positron annihilation) ──────────────────────────────
  {
    id:       'annihilation',
    label:    '正负电子湮灭',
    labelEn:  'e⁺e⁻ annihilation',
    descZh:   'e⁺e⁻ → γγ',
    descEn:   'e⁺e⁻ → γγ',
    particles: [
      { from: [0.05, 0.35], to: [0.4, 0.5],  type: 'fermion', label: 'e⁻', labelEn: 'e⁻', arrow: 'forward',  tStart: 0,    tEnd: 0.30 },
      { from: [0.05, 0.65], to: [0.4, 0.5],  type: 'fermion', label: 'e⁺', labelEn: 'e⁺', arrow: 'backward', tStart: 0,    tEnd: 0.30 },
      { from: [0.4,  0.5],  to: [0.95, 0.25],type: 'photon',  label: 'γ',  labelEn: 'γ',  arrow: 'none',     tStart: 0.35, tEnd: 0.65 },
      { from: [0.4,  0.5],  to: [0.95, 0.75],type: 'photon',  label: 'γ',  labelEn: 'γ',  arrow: 'none',     tStart: 0.35, tEnd: 0.65 },
    ],
    vertices: [
      { pos: [0.4, 0.5], t: 0.32 },
    ],
  },

  // ── 1: Compton scattering (e-γ → e-γ) ─────────────────────────────────
  {
    id:       'compton',
    label:    '康普顿散射',
    labelEn:  'Compton scattering',
    descZh:   'e⁻γ → e⁻γ',
    descEn:   'e⁻γ → e⁻γ',
    particles: [
      { from: [0.05, 0.70], to: [0.40, 0.70], type: 'fermion', label: 'e⁻',       labelEn: 'e⁻',       arrow: 'forward',  tStart: 0,    tEnd: 0.30 },
      { from: [0.05, 0.30], to: [0.40, 0.30], type: 'photon',  label: 'γ',        labelEn: 'γ',        arrow: 'none',     tStart: 0,    tEnd: 0.30 },
      { from: [0.40, 0.30], to: [0.40, 0.70], type: 'fermion', label: 'e⁻ (prop)',labelEn: 'e⁻ (prop)',arrow: 'forward',  tStart: 0.32, tEnd: 0.52, faded: true },
      { from: [0.40, 0.30], to: [0.95, 0.10], type: 'photon',  label: 'γ',        labelEn: 'γ',        arrow: 'none',     tStart: 0.55, tEnd: 0.75 },
      { from: [0.40, 0.70], to: [0.95, 0.90], type: 'fermion', label: 'e⁻',       labelEn: 'e⁻',       arrow: 'forward',  tStart: 0.55, tEnd: 0.75 },
    ],
    vertices: [
      { pos: [0.40, 0.30], t: 0.31 },
      { pos: [0.40, 0.70], t: 0.53 },
    ],
  },

  // ── 2: e+e- → μ+μ- (via virtual photon, s-channel) ───────────────────
  {
    id:       'dilepton',
    label:    '轻子对产生',
    labelEn:  'Dilepton production',
    descZh:   'e⁺e⁻ → μ⁺μ⁻',
    descEn:   'e⁺e⁻ → μ⁺μ⁻',
    particles: [
      { from: [0.05, 0.35], to: [0.42, 0.50], type: 'fermion', label: 'e⁻', labelEn: 'e⁻', arrow: 'forward',  tStart: 0,    tEnd: 0.30 },
      { from: [0.05, 0.65], to: [0.42, 0.50], type: 'fermion', label: 'e⁺', labelEn: 'e⁺', arrow: 'backward', tStart: 0,    tEnd: 0.30 },
      { from: [0.42, 0.50], to: [0.58, 0.50], type: 'photon',  label: 'γ*', labelEn: 'γ*', arrow: 'none',     tStart: 0.32, tEnd: 0.52, faded: true },
      { from: [0.58, 0.50], to: [0.95, 0.35], type: 'fermion', label: 'μ⁻', labelEn: 'μ⁻', arrow: 'forward',  tStart: 0.54, tEnd: 0.75 },
      { from: [0.58, 0.50], to: [0.95, 0.65], type: 'fermion', label: 'μ⁺', labelEn: 'μ⁺', arrow: 'backward', tStart: 0.54, tEnd: 0.75 },
    ],
    vertices: [
      { pos: [0.42, 0.50], t: 0.31 },
      { pos: [0.58, 0.50], t: 0.53 },
    ],
  },

  // ── 3: Møller scattering (e-e- → e-e-, t-channel) ─────────────────────
  {
    id:       'moller',
    label:    'Møller散射',
    labelEn:  'Møller scattering',
    descZh:   'e⁻e⁻ → e⁻e⁻',
    descEn:   'e⁻e⁻ → e⁻e⁻',
    particles: [
      { from: [0.05, 0.25], to: [0.45, 0.38], type: 'fermion', label: 'e⁻', labelEn: 'e⁻', arrow: 'forward', tStart: 0,    tEnd: 0.30 },
      { from: [0.05, 0.75], to: [0.45, 0.62], type: 'fermion', label: 'e⁻', labelEn: 'e⁻', arrow: 'forward', tStart: 0,    tEnd: 0.30 },
      { from: [0.45, 0.38], to: [0.45, 0.62], type: 'photon',  label: 'γ',  labelEn: 'γ',  arrow: 'none',    tStart: 0.32, tEnd: 0.55, faded: true },
      { from: [0.45, 0.38], to: [0.95, 0.25], type: 'fermion', label: 'e⁻', labelEn: 'e⁻', arrow: 'forward', tStart: 0.57, tEnd: 0.78 },
      { from: [0.45, 0.62], to: [0.95, 0.75], type: 'fermion', label: 'e⁻', labelEn: 'e⁻', arrow: 'forward', tStart: 0.57, tEnd: 0.78 },
    ],
    vertices: [
      { pos: [0.45, 0.38], t: 0.31 },
      { pos: [0.45, 0.62], t: 0.31 },
    ],
  },
]

// ── State ─────────────────────────────────────────────────────────────────

type FeynmanState = {
  animT:       number
  lastDiagram: string
}

// ── Rendering helpers ─────────────────────────────────────────────────────

const MARGIN = 40

function toScreen(
  nx: number, ny: number,
  w:  number, h:  number,
): [number, number] {
  return [
    MARGIN + nx * (w - 2 * MARGIN),
    MARGIN + ny * (h - 2 * MARGIN),
  ]
}

/**
 * Draw a fermion (solid straight line) from p1 to p2.
 * tLocal ∈ [0,1] is how far along the line we draw.
 * Arrow drawn at the midpoint of the drawn segment.
 */
function drawFermion(
  ctx:     CanvasRenderingContext2D,
  p1:      [number, number],
  p2:      [number, number],
  tLocal:  number,
  arrow:   ArrowDir,
  faded:   boolean,
) {
  if (tLocal <= 0) return

  const ex = p1[0] + (p2[0] - p1[0]) * tLocal
  const ey = p1[1] + (p2[1] - p1[1]) * tLocal

  ctx.save()
  ctx.globalAlpha = faded ? 0.45 : 1.0
  ctx.strokeStyle = '#60a5fa'
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(p1[0], p1[1])
  ctx.lineTo(ex, ey)
  ctx.stroke()

  // Arrow: small triangle at midpoint, pointing along direction of travel
  if (arrow !== 'none' && tLocal > 0.1) {
    const mx  = p1[0] + (p2[0] - p1[0]) * tLocal * 0.5
    const my  = p1[1] + (p2[1] - p1[1]) * tLocal * 0.5
    const dx  = p2[0] - p1[0]
    const dy  = p2[1] - p1[1]
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) { ctx.restore(); return }
    // For 'backward', flip the arrow direction
    const sign = arrow === 'forward' ? 1 : -1
    const ux   = (dx / len) * sign
    const uy   = (dy / len) * sign
    const sz   = 7
    // perpendicular
    const px   = -uy
    const py   =  ux

    ctx.fillStyle = '#60a5fa'
    ctx.beginPath()
    ctx.moveTo(mx + ux * sz,       my + uy * sz)
    ctx.lineTo(mx - ux * sz * 0.5 + px * sz * 0.5, my - uy * sz * 0.5 + py * sz * 0.5)
    ctx.lineTo(mx - ux * sz * 0.5 - px * sz * 0.5, my - uy * sz * 0.5 - py * sz * 0.5)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

/**
 * Draw a photon line (sinusoidal wiggle) from p1 to p2.
 * tLocal ∈ [0,1] controls how far along we draw.
 */
function drawPhoton(
  ctx:    CanvasRenderingContext2D,
  p1:     [number, number],
  p2:     [number, number],
  tLocal: number,
  faded:  boolean,
) {
  if (tLocal <= 0) return

  const N      = 60
  const A      = 8    // wiggle amplitude in px
  const K      = 12   // number of oscillations
  const dx     = p2[0] - p1[0]
  const dy     = p2[1] - p1[1]
  const len    = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return

  // Unit vectors along and perpendicular to the line
  const ux = dx / len
  const uy = dy / len
  const px = -uy
  const py =  ux

  ctx.save()
  ctx.globalAlpha  = faded ? 0.45 : 1.0
  ctx.strokeStyle  = '#c8955a'
  ctx.lineWidth    = 1.5
  ctx.beginPath()

  const nDraw = Math.round(N * tLocal)
  for (let i = 0; i <= nDraw; i++) {
    const s  = i / N               // 0..1 along full line
    const t2 = i / N * tLocal      // actual progress fraction used for position
    const along = s * len * tLocal
    const perp  = A * Math.sin(K * Math.PI * 2 * (i / N))
    const sx    = p1[0] + ux * along + px * perp
    const sy    = p1[1] + uy * along + py * perp
    if (i === 0) ctx.moveTo(sx, sy)
    else         ctx.lineTo(sx, sy)
    void t2 // suppress unused warning
  }

  ctx.stroke()
  ctx.restore()
}

/** Draw a vertex dot that pulses once when it first appears. */
function drawVertex(
  ctx:    CanvasRenderingContext2D,
  pos:    [number, number],
  animT:  number,
  vt:     number,
) {
  if (animT < vt) return
  const elapsed = animT - vt
  // Pulse: scale from 1.5 → 1.0 over first 0.1 of animT
  const pulse = elapsed < 0.1 ? 1.0 + 0.5 * (1 - elapsed / 0.1) : 1.0
  const r     = 5 * pulse

  ctx.save()
  ctx.shadowBlur  = 8
  ctx.shadowColor = '#ffffff'
  ctx.fillStyle   = '#ffffff'
  ctx.beginPath()
  ctx.arc(pos[0], pos[1], r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

// ── Module ────────────────────────────────────────────────────────────────

const FeynmanDiagramsModule: PhysicsModule<FeynmanState> = {
  id: 'feynman-diagrams',

  metadata: {
    title:         '费曼图',
    titleEn:       'Feynman Diagrams',
    description:   '量子场论中粒子相互作用的图形化表示。每个图对应一个散射振幅的贡献。',
    descriptionEn: 'Graphical representation of particle interactions in quantum field theory. Each diagram corresponds to a term in the scattering amplitude.',
    theory:        ['quantum-field-theory', 'particle-physics'],
    mathLevel:     2,
    renderer:      'canvas2d',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(_canvas, params): FeynmanState {
    return {
      animT:       0,
      lastDiagram: params.diagram as string,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): FeynmanState {
    const diagramId = params.diagram as string
    const speed     = params.speed   as number

    let { animT, lastDiagram } = state

    // Reset animation when diagram changes
    if (diagramId !== lastDiagram) {
      animT       = 0
      lastDiagram = diagramId
    }

    // Advance and loop
    animT += dt * speed / 3
    if (animT > 1.1) animT = 0

    return { animT, lastDiagram }
  },

  // ── Render ────────────────────────────────────────────────────────────────

  render(state, canvas, params) {
    const el          = canvas as HTMLCanvasElement
    const ctx         = el.getContext('2d')
    if (!ctx) return

    const w           = el.width
    const h           = el.height
    const diagramIdx  = parseInt(params.diagram as string, 10)
    const showLabels  = params.showLabels as boolean
    const lang        = (params._lang as string) ?? 'en'
    const { animT }   = state

    const diagram = DIAGRAMS[diagramIdx] ?? DIAGRAMS[0]

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = '#030610'
    ctx.fillRect(0, 0, w, h)

    // ── Subtle horizontal reference line ─────────────────────────────────
    ctx.save()
    ctx.globalAlpha = 0.06
    ctx.strokeStyle = '#f0ede8'
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 8])
    const midY = h * 0.5
    ctx.beginPath()
    ctx.moveTo(MARGIN, midY)
    ctx.lineTo(w - MARGIN, midY)
    ctx.stroke()
    ctx.restore()

    // ── Diagram process label ─────────────────────────────────────────────
    ctx.save()
    ctx.font      = '12px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.45)'
    ctx.textAlign = 'center'
    const processLabel = lang === 'zh' ? diagram.descZh : diagram.descEn
    ctx.fillText(processLabel, w / 2, MARGIN * 0.7)
    ctx.restore()

    // ── Draw particles ────────────────────────────────────────────────────
    for (const p of diagram.particles) {
      const tLocal = Math.min(1, Math.max(0,
        (animT - p.tStart) / Math.max(0.001, p.tEnd - p.tStart)
      ))

      const sp1 = toScreen(p.from[0], p.from[1], w, h)
      const sp2 = toScreen(p.to[0],   p.to[1],   w, h)

      if (p.type === 'fermion') {
        drawFermion(ctx, sp1, sp2, tLocal, p.arrow, p.faded ?? false)
      } else {
        // photon / z-boson / gluon — all rendered as wiggly lines for now
        drawPhoton(ctx, sp1, sp2, tLocal, p.faded ?? false)
      }

      // ── Particle label near endpoint ─────────────────────────────────
      if (showLabels && tLocal > 0.8) {
        ctx.save()
        ctx.globalAlpha = (tLocal - 0.8) / 0.2
        ctx.font        = '10px monospace'
        ctx.fillStyle   = 'rgba(240,237,232,0.70)'
        const lx        = sp2[0] + 8
        const ly        = sp2[1] + 4
        const lbl       = lang === 'zh' ? p.label : p.labelEn
        ctx.fillText(lbl, lx, ly)
        ctx.restore()
      }
    }

    // ── Draw vertices ─────────────────────────────────────────────────────
    for (const v of diagram.vertices) {
      const sv = toScreen(v.pos[0], v.pos[1], w, h)
      drawVertex(ctx, sv, animT, v.t)
    }
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'select',
        id:      'diagram',
        label:   '反应过程',
        labelEn: 'Process',
        options: [
          { value: '0', label: '正负电子湮灭', labelEn: 'e⁺e⁻ annihilation' },
          { value: '1', label: '康普顿散射',   labelEn: 'Compton scattering' },
          { value: '2', label: '轻子对产生',   labelEn: 'Dilepton production' },
          { value: '3', label: 'Møller散射',   labelEn: 'Møller scattering'  },
        ],
        default: '0',
      },
      {
        type:    'slider',
        id:      'speed',
        label:   '速度',
        labelEn: 'Speed',
        min:     0.3,
        max:     3,
        step:    0.3,
        default: 1,
      },
      {
        type:    'toggle',
        id:      'showLabels',
        label:   '粒子标签',
        labelEn: 'Show labels',
        default: true,
      },
    ]
  },

  // ── Destroy ───────────────────────────────────────────────────────────────

  destroy(_canvas) {
    // Canvas 2D — no resources to release
  },
}

export default FeynmanDiagramsModule

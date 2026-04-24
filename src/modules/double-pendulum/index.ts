// Double Pendulum — Classical Chaos
// Two pendulums: primary (copper) and shadow (blue) with θ₁ offset by ε = 0.001 rad.
// Their trajectories diverge exponentially, visualising sensitive dependence on
// initial conditions. Trails use pre-allocated circular Float32Array buffers (zero GC).

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import { rk4 } from '@/core/physics-engine'

const G        = 9.81
const MAX_TRAIL = 600
const EPS      = 0.001   // initial angle offset for shadow pendulum

// ── Physics ───────────────────────────────────────────────────────────────────

function derivatives(q: number[], p: Params): number[] {
  const [θ1, ω1, θ2, ω2] = q
  const m1 = p.mass1 as number
  const m2 = p.mass2 as number
  const l1 = p.length1 as number
  const l2 = p.length2 as number
  const Δ  = θ2 - θ1
  const M  = m1 + m2
  const d  = (2 * M - m2 * Math.cos(2 * Δ))

  const α1 = (
    -G * 2 * M * Math.sin(θ1)
    - m2 * G * Math.sin(θ1 - 2 * θ2)
    - 2 * Math.sin(Δ) * m2 * (ω2*ω2*l2 + ω1*ω1*l1*Math.cos(Δ))
  ) / (d * l1)

  const α2 = (
    2 * Math.sin(Δ) * (
      ω1*ω1*l1*M + G*M*Math.cos(θ1) + ω2*ω2*l2*m2*Math.cos(Δ)
    )
  ) / (d * l2)

  return [ω1, α1, ω2, α2]
}

// ── Trail circular buffer ──────────────────────────────────────────────────────

type Trail = {
  buf:  Float32Array   // x0,y0, x1,y1, … (2 floats per point)
  head: number         // next write index
  fill: number         // valid points so far (≤ MAX_TRAIL)
}

function makeTrail(): Trail {
  return { buf: new Float32Array(MAX_TRAIL * 2), head: 0, fill: 0 }
}

function trailPush(t: Trail, x: number, y: number) {
  t.buf[t.head * 2]     = x
  t.buf[t.head * 2 + 1] = y
  t.head = (t.head + 1) % MAX_TRAIL
  if (t.fill < MAX_TRAIL) t.fill++
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  t: Trail,
  r: number, g: number, b: number,
  maxAlpha = 0.75,
) {
  if (t.fill < 2) return
  const oldest = t.fill === MAX_TRAIL ? t.head : 0
  ctx.save()
  for (let i = 1; i < t.fill; i++) {
    const prev = (oldest + i - 1) % MAX_TRAIL
    const cur  = (oldest + i)     % MAX_TRAIL
    const alpha = (i / t.fill) * maxAlpha
    ctx.beginPath()
    ctx.moveTo(t.buf[prev*2], t.buf[prev*2+1])
    ctx.lineTo(t.buf[cur*2],  t.buf[cur*2+1])
    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
    ctx.lineWidth = 1.2
    ctx.stroke()
  }
  ctx.restore()
}

// ── State ─────────────────────────────────────────────────────────────────────

type State = {
  q:   number[]   // primary   [θ1, ω1, θ2, ω2]
  qs:  number[]   // shadow    [θ1+ε, ω1, θ2, ω2]
  t1:  Trail; t2:  Trail   // primary trails
  ts1: Trail; ts2: Trail   // shadow  trails
  ctx: CanvasRenderingContext2D | null
}

function makeState(params: Params): State {
  const θ1 = params.theta1 as number
  const θ2 = params.theta2 as number
  return {
    q:   [θ1,       0, θ2, 0],
    qs:  [θ1 + EPS, 0, θ2, 0],
    t1: makeTrail(), t2: makeTrail(),
    ts1: makeTrail(), ts2: makeTrail(),
    ctx: null,
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

const DoublePendulumModule: PhysicsModule<State> = {
  id: 'double-pendulum',

  metadata: {
    title:       '双摆混沌',
    titleEn:     'Double Pendulum',
    description:  '经典混沌系统——铜色与蓝色摆初始角度仅差 0.001 rad，轨迹指数级发散。',
    descriptionEn: 'A classical chaotic system — copper and blue pendulums start 0.001 rad apart and diverge exponentially.',
    theory:    ['classical-mechanics'],
    mathLevel: 2,
    renderer:  'canvas2d',
  },

  init(canvas, params): State {
    const s  = makeState(params)
    s.ctx    = (canvas as HTMLCanvasElement).getContext('2d')!
    return s
  },

  tick(state, dt, params): State {
    if ((params.reset as boolean) === true) {
      const s  = makeState(params)
      s.ctx    = state.ctx
      return s
    }

    const STEPS = 12
    const dts   = dt / STEPS
    let q  = state.q
    let qs = state.qs

    for (let i = 0; i < STEPS; i++) {
      q  = rk4(q,  (v) => derivatives(v, params), dts)
      qs = rk4(qs, (v) => derivatives(v, params), dts)
    }

    const l1 = params.length1 as number
    const l2 = params.length2 as number
    const cvs = state.ctx!.canvas
    const cx  = cvs.width  / 2
    const cy  = cvs.height * 0.32
    const sc  = Math.min(cvs.width, cvs.height) * 0.28

    const x1  = cx + Math.sin(q[0])  * l1 * sc;  const y1  = cy + Math.cos(q[0])  * l1 * sc
    const x2  = x1 + Math.sin(q[2])  * l2 * sc;  const y2  = y1 + Math.cos(q[2])  * l2 * sc
    const x1s = cx + Math.sin(qs[0]) * l1 * sc;  const y1s = cy + Math.cos(qs[0]) * l1 * sc
    const x2s = x1s + Math.sin(qs[2]) * l2 * sc; const y2s = y1s + Math.cos(qs[2]) * l2 * sc

    trailPush(state.t1,  x1,  y1)
    trailPush(state.t2,  x2,  y2)
    trailPush(state.ts1, x1s, y1s)
    trailPush(state.ts2, x2s, y2s)

    return { ...state, q, qs }
  },

  render(state, canvas, params) {
    const ctx = state.ctx!
    const cvs = canvas as HTMLCanvasElement
    const w   = cvs.width, h = cvs.height
    const cx  = w / 2, cy = h * 0.32
    const sc  = Math.min(w, h) * 0.28
    const l1  = params.length1 as number
    const l2  = params.length2 as number
    const m1  = params.mass1   as number
    const m2  = params.mass2   as number
    const [θ1, , θ2]   = state.q
    const [θ1s,,θ2s]   = state.qs

    // Background fade
    ctx.fillStyle = 'rgba(4,4,12,0.30)'
    ctx.fillRect(0, 0, w, h)

    // Trails — shadow first (underneath)
    if (params.showShadow !== false) {
      drawTrail(ctx, state.ts1,  96, 165, 250, 0.28)  // blue, dim
      drawTrail(ctx, state.ts2,  96, 165, 250, 0.38)
    }
    drawTrail(ctx, state.t1, 200, 149,  90, 0.45)   // copper
    drawTrail(ctx, state.t2, 200, 149,  90, 0.65)

    // Pendulum geometry
    const x1  = cx + Math.sin(θ1)  * l1 * sc,  y1  = cy + Math.cos(θ1)  * l1 * sc
    const x2  = x1 + Math.sin(θ2)  * l2 * sc,  y2  = y1 + Math.cos(θ2)  * l2 * sc
    const x1s = cx + Math.sin(θ1s) * l1 * sc,  y1s = cy + Math.cos(θ1s) * l1 * sc
    const x2s = x1s + Math.sin(θ2s)* l2 * sc,  y2s = y1s+ Math.cos(θ2s)* l2 * sc

    const r1 = 5 + m1 * 3.5
    const r2 = 5 + m2 * 3.5

    // Shadow pendulum rods
    if (params.showShadow !== false) {
      ctx.strokeStyle = 'rgba(96,165,250,0.35)'
      ctx.lineWidth   = 1.5
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1s, y1s); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x1s, y1s); ctx.lineTo(x2s, y2s); ctx.stroke()
    }

    // Primary rods
    ctx.strokeStyle = 'rgba(240,237,232,0.70)'
    ctx.lineWidth   = 2
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()

    // Pivot
    ctx.fillStyle = '#888899'
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill()

    // Shadow bobs
    if (params.showShadow !== false) {
      ctx.fillStyle = 'rgba(96,165,250,0.45)'
      ctx.beginPath(); ctx.arc(x1s, y1s, r1 * 0.75, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = 'rgba(96,165,250,0.55)'
      ctx.beginPath(); ctx.arc(x2s, y2s, r2 * 0.75, 0, Math.PI*2); ctx.fill()
    }

    // Primary bobs
    ctx.fillStyle = '#c8955a'
    ctx.beginPath(); ctx.arc(x1, y1, r1, 0, Math.PI*2); ctx.fill()
    ctx.fillStyle = '#e8b070'
    ctx.beginPath(); ctx.arc(x2, y2, r2, 0, Math.PI*2); ctx.fill()

    // Divergence indicator
    const dx = x2 - x2s, dy = y2 - y2s
    const dist = Math.sqrt(dx*dx + dy*dy)
    const logDiv = dist > 0.5 ? Math.log10(dist / sc) : -3   // in units of l

    // Top-right overlay
    const px = w - 12, py = 14
    ctx.font      = '10px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(240,237,232,0.30)'
    ctx.fillText('divergence', px, py)
    ctx.fillStyle = dist > sc * 0.5 ? '#f07878' : '#c8955a'
    ctx.font = '13px monospace'
    ctx.fillText(
      dist < 0.5 ? `< 0.01 l` : `${(dist / sc).toFixed(3)} l`,
      px, py + 14,
    )

    // Divergence bar (thin strip at top)
    const barW = Math.min(1, dist / (sc * 1.5)) * (w * 0.4)
    ctx.fillStyle = `rgba(240,120,120,0.55)`
    ctx.fillRect(w * 0.3, 0, barW, 3)

    ctx.textAlign = 'left'
  },

  getControls(): ControlDefinition[] {
    return [
      { type: 'slider', id: 'theta1',     label: '初始角度 1',   labelEn: 'Initial Angle 1',   min: 0,   max: Math.PI, step: 0.01, default: Math.PI * 0.8 },
      { type: 'slider', id: 'theta2',     label: '初始角度 2',   labelEn: 'Initial Angle 2',   min: 0,   max: Math.PI, step: 0.01, default: Math.PI * 0.9 },
      { type: 'slider', id: 'mass1',      label: '质量 1',       labelEn: 'Mass 1',            min: 0.5, max: 5,       step: 0.1,  default: 1 },
      { type: 'slider', id: 'mass2',      label: '质量 2',       labelEn: 'Mass 2',            min: 0.5, max: 5,       step: 0.1,  default: 1 },
      { type: 'slider', id: 'length1',    label: '杆长 1',       labelEn: 'Rod Length 1',      min: 0.2, max: 1,       step: 0.05, default: 0.5 },
      { type: 'slider', id: 'length2',    label: '杆长 2',       labelEn: 'Rod Length 2',      min: 0.2, max: 1,       step: 0.05, default: 0.5 },
      { type: 'toggle', id: 'showShadow', label: '显示影子摆',   labelEn: 'Show shadow',       default: true },
      { type: 'button', id: 'reset',      label: '重置',         labelEn: 'Reset' },
    ]
  },

  destroy() {},
}

export default DoublePendulumModule

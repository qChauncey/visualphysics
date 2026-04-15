// Quantum Tunneling — 1D wave packet vs rectangular potential barrier
//
// A Gaussian wave packet ψ(x,0) = exp(-(x-x0)²/4σ²) · exp(ik₀x) propagates
// toward a rectangular barrier V(x) = V₀ for |x - xb| < L/2.
//
// Physics:  1D time-dependent Schrödinger equation (ℏ = m = 1)
//   iψ̇ = -½ψ'' + V(x)ψ
//
// Numerical method: leapfrog (FDTD) on staggered real/imaginary parts.
//   im(t+dt/2) = im(t-dt/2) + dt·[-½·D²re(t) + V·re(t)]
//   re(t+dt)   = re(t)       - dt·[-½·D²im(t+dt/2) + V·im(t+dt/2)]
// where D² is the second-difference operator.  Stable for dt < dx²/2.
//
// Tunneling probability: T ≈ exp(-2κL), κ = √(2(V₀ - E))  (for E < V₀).

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── State ─────────────────────────────────────────────────────────────────────

type TunnelState = {
  re: Float64Array       // real part of wavefunction on grid
  im: Float64Array       // imaginary part (staggered half-step ahead)
  V: Float64Array        // potential on grid
  N: number              // grid points
  dx: number             // spatial step
  dt: number             // time step
  xmin: number           // left boundary
  t: number              // elapsed simulation time
  finished: boolean      // true after packet has mostly passed/reflected
  resetTimer: number     // countdown (seconds) to auto-reset after finished
  // cache param signature so we know when to reinitialise
  paramKey: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const N     = 800
const XMIN  = -40
const XMAX  =  40
const DX    = (XMAX - XMIN) / N
const X0    = -15          // initial packet centre
const SIGMA = 2            // initial packet width
const XB    = 0            // barrier centre

// Time step — must satisfy dt < dx² for leapfrog stability.
// dx ≈ 0.1, dx² = 0.01.  We use dt = 0.005 for a good margin.
const DT_BASE = 0.005

// ── Helpers ───────────────────────────────────────────────────────────────────

function paramKey(params: Params): string {
  return `${params.barrierHeight}|${params.barrierWidth}|${params.energy}`
}

/** Build potential array for a rectangular barrier centred at XB */
function buildPotential(V0: number, L: number): Float64Array {
  const V = new Float64Array(N)
  const halfL = L / 2
  for (let j = 0; j < N; j++) {
    const x = XMIN + j * DX
    V[j] = (Math.abs(x - XB) <= halfL) ? V0 : 0
  }
  return V
}

/** Initialise Gaussian wave packet with momentum k0 */
function initWavePacket(k0: number): { re: Float64Array; im: Float64Array } {
  const re = new Float64Array(N)
  const im = new Float64Array(N)
  const sig2 = SIGMA * SIGMA
  // Normalisation not critical for visualisation, but keeps amplitudes sane
  const norm = 1 / Math.pow(2 * Math.PI * sig2, 0.25)
  for (let j = 0; j < N; j++) {
    const x = XMIN + j * DX
    const dx2 = (x - X0) * (x - X0)
    const envelope = norm * Math.exp(-dx2 / (4 * sig2))
    re[j] = envelope * Math.cos(k0 * x)
    im[j] = envelope * Math.sin(k0 * x)
  }
  return { re, im }
}

/** Perform one leapfrog half-step to stagger im ahead by dt/2 at init */
function staggerIm(
  re: Float64Array,
  im: Float64Array,
  V: Float64Array,
  dt: number,
): void {
  const halfDt = dt / 2
  const coeff = 0.5 / (DX * DX)
  for (let j = 1; j < N - 1; j++) {
    const d2re = (re[j + 1] - 2 * re[j] + re[j - 1]) * coeff
    im[j] += halfDt * (-d2re + V[j] * re[j])
  }
}

/** Absorbing boundary: apply a smooth damping envelope near edges */
function applyAbsorbingBC(re: Float64Array, im: Float64Array): void {
  const width = 40  // grid points of absorbing region
  for (let i = 0; i < width; i++) {
    const factor = i / width
    const f2 = factor * factor  // quadratic ramp for smoother absorption
    // left edge
    re[i] *= f2
    im[i] *= f2
    // right edge
    const j = N - 1 - i
    re[j] *= f2
    im[j] *= f2
  }
}

/** Total probability (should stay near 1 if numerics are good) */
function totalProb(re: Float64Array, im: Float64Array): number {
  let sum = 0
  for (let j = 0; j < N; j++) {
    sum += re[j] * re[j] + im[j] * im[j]
  }
  return sum * DX
}

/** Probability in region x > xb (transmitted fraction) */
function transmittedProb(re: Float64Array, im: Float64Array): number {
  const jBarrier = Math.floor((XB - XMIN) / DX)
  let sum = 0
  for (let j = jBarrier; j < N; j++) {
    sum += re[j] * re[j] + im[j] * im[j]
  }
  return sum * DX
}

// ── Module ────────────────────────────────────────────────────────────────────

const QuantumTunneling: PhysicsModule<TunnelState> = {
  id: 'quantum-tunneling',

  metadata: {
    title: '量子隧穿',
    titleEn: 'Quantum Tunneling',
    description: '波包撞击势垒——经典粒子被完全反弹，量子粒子却有概率穿透。',
    descriptionEn:
      'A wave packet hits a potential barrier — classical particles bounce back, but quantum particles have a probability of tunneling through.',
    theory: ['quantum-mechanics'],
    mathLevel: 2,
    renderer: 'canvas2d',
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(_canvas, params): TunnelState {
    const V0 = (params.barrierHeight as number) ?? 3
    const L = (params.barrierWidth as number) ?? 2
    const E = (params.energy as number) ?? 2
    const k0 = Math.sqrt(2 * E)

    const V = buildPotential(V0, L)
    const { re, im } = initWavePacket(k0)

    // Stagger imaginary part by half a time step for leapfrog
    staggerIm(re, im, V, DT_BASE)

    return {
      re,
      im,
      V,
      N,
      dx: DX,
      dt: DT_BASE,
      xmin: XMIN,
      t: 0,
      finished: false,
      resetTimer: 0,
      paramKey: paramKey(params),
    }
  },

  tick(state, dt, params): TunnelState {
    // If params changed, re-initialise
    const key = paramKey(params)
    if (key !== state.paramKey) {
      return this.init(null as unknown as HTMLElement, params)
    }

    const speed = (params.speed as number) ?? 1

    // Handle auto-reset countdown
    if (state.finished) {
      const newTimer = state.resetTimer - dt
      if (newTimer <= 0) {
        return this.init(null as unknown as HTMLElement, params)
      }
      return { ...state, resetTimer: newTimer }
    }

    // Number of sub-steps per frame — scale with speed and cap for stability
    const stepsPerFrame = Math.round(speed * 60)
    const simDt = state.dt

    // Work on copies to avoid mutating frozen state
    const re = new Float64Array(state.re)
    const im = new Float64Array(state.im)
    const V = state.V
    const coeff = 0.5 / (DX * DX)

    for (let step = 0; step < stepsPerFrame; step++) {
      // Leapfrog step 1: advance im by dt using re at current time
      for (let j = 1; j < N - 1; j++) {
        const d2re = (re[j + 1] - 2 * re[j] + re[j - 1]) * coeff
        im[j] += simDt * (-d2re + V[j] * re[j])
      }

      // Leapfrog step 2: advance re by dt using im (now at t + dt/2)
      for (let j = 1; j < N - 1; j++) {
        const d2im = (im[j + 1] - 2 * im[j] + im[j - 1]) * coeff
        re[j] -= simDt * (-d2im + V[j] * im[j])
      }

      // Hard boundary (wavefunction = 0 at edges, reinforced)
      re[0] = 0; re[N - 1] = 0
      im[0] = 0; im[N - 1] = 0
    }

    // Absorbing boundaries to prevent reflections from domain edges
    applyAbsorbingBC(re, im)

    const newT = state.t + stepsPerFrame * simDt

    // Check if simulation is "finished" — most probability has dispersed
    // or the packet has had enough time to fully interact with barrier
    const prob = totalProb(re, im)
    const finished = newT > 25 && prob < 0.15

    return {
      ...state,
      re,
      im,
      t: newT,
      finished,
      resetTimer: finished ? 3 : 0,
    }
  },

  render(state, canvas, params) {
    const el = canvas as HTMLCanvasElement
    const ctx = el.getContext('2d')!
    const W = el.width
    const H = el.height

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = '#060810'
    ctx.fillRect(0, 0, W, H)

    const V0 = (params.barrierHeight as number) ?? 3
    const L = (params.barrierWidth as number) ?? 2

    // Coordinate transforms: physics x -> canvas px
    const toCanvasX = (x: number) => ((x - XMIN) / (XMAX - XMIN)) * W
    const baseline = H * 0.72   // |ψ|² baseline
    const vBaseline = H * 0.12  // V(x) baseline (near top)

    // ── Draw potential barrier ────────────────────────────────────────────
    const bxLeft = toCanvasX(XB - L / 2)
    const bxRight = toCanvasX(XB + L / 2)
    const bWidth = bxRight - bxLeft

    // Filled barrier rectangle
    ctx.fillStyle = 'rgba(200, 149, 90, 0.25)'
    ctx.fillRect(bxLeft, vBaseline, bWidth, baseline - vBaseline)

    // Barrier outline
    ctx.strokeStyle = 'rgba(200, 149, 90, 0.50)'
    ctx.lineWidth = 1.5
    ctx.strokeRect(bxLeft, vBaseline, bWidth, baseline - vBaseline)

    // ── Draw V(x) line at top ─────────────────────────────────────────────
    const vScale = (H * 0.08) / Math.max(V0, 1)  // height of V0 in pixels
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(200, 149, 90, 0.6)'
    ctx.lineWidth = 1.2
    for (let j = 0; j < N; j++) {
      const px = toCanvasX(XMIN + j * DX)
      const py = vBaseline - state.V[j] * vScale
      if (j === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.stroke()

    // V₀ label
    const fSz = Math.max(9, Math.round(W * 0.011))
    ctx.font = `${fSz}px monospace`
    ctx.fillStyle = 'rgba(200, 149, 90, 0.7)'
    ctx.textAlign = 'left'
    const vLabelX = bxRight + 6
    const vLabelY = vBaseline - V0 * vScale + fSz * 0.35
    ctx.fillText(`V\u2080 = ${V0.toFixed(1)}`, vLabelX, vLabelY)

    // L label (barrier width)
    ctx.textAlign = 'center'
    ctx.fillText(`L = ${L.toFixed(1)}`, (bxLeft + bxRight) / 2, baseline + fSz + 4)

    // ── Compute |ψ|² ──────────────────────────────────────────────────────
    const prob = new Float64Array(N)
    let maxProb = 0
    for (let j = 0; j < N; j++) {
      prob[j] = state.re[j] * state.re[j] + state.im[j] * state.im[j]
      if (prob[j] > maxProb) maxProb = prob[j]
    }

    // Scale so max |ψ|² fills a reasonable portion of vertical space
    const waveHeight = H * 0.48
    const scale = maxProb > 1e-12 ? waveHeight / maxProb : 0

    // ── Draw |ψ|² filled area with gradient ───────────────────────────────
    // Gradient: blue on left (incident/reflected), purple on right (transmitted)
    const grad = ctx.createLinearGradient(0, 0, W, 0)
    grad.addColorStop(0.0, 'rgba(96, 165, 250, 0.75)')   // blue #60a5fa
    grad.addColorStop(0.45, 'rgba(96, 165, 250, 0.75)')
    grad.addColorStop(0.55, 'rgba(176, 138, 240, 0.75)')  // purple #b08af0
    grad.addColorStop(1.0, 'rgba(176, 138, 240, 0.75)')

    ctx.beginPath()
    ctx.moveTo(toCanvasX(XMIN), baseline)
    for (let j = 0; j < N; j++) {
      const px = toCanvasX(XMIN + j * DX)
      const py = baseline - prob[j] * scale
      ctx.lineTo(px, py)
    }
    ctx.lineTo(toCanvasX(XMAX), baseline)
    ctx.closePath()
    ctx.fillStyle = grad
    ctx.fill()

    // Bright edge line on top of the filled area
    const lineGrad = ctx.createLinearGradient(0, 0, W, 0)
    lineGrad.addColorStop(0.0, 'rgba(96, 165, 250, 0.9)')
    lineGrad.addColorStop(0.45, 'rgba(96, 165, 250, 0.9)')
    lineGrad.addColorStop(0.55, 'rgba(176, 138, 240, 0.9)')
    lineGrad.addColorStop(1.0, 'rgba(176, 138, 240, 0.9)')

    ctx.beginPath()
    for (let j = 0; j < N; j++) {
      const px = toCanvasX(XMIN + j * DX)
      const py = baseline - prob[j] * scale
      if (j === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.strokeStyle = lineGrad
    ctx.lineWidth = 1.5
    ctx.stroke()

    // ── Baseline axis ─────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(240, 237, 232, 0.12)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, baseline)
    ctx.lineTo(W, baseline)
    ctx.stroke()

    // ── Axis labels ───────────────────────────────────────────────────────
    ctx.font = `${fSz}px monospace`
    ctx.fillStyle = 'rgba(240, 237, 232, 0.28)'
    ctx.textAlign = 'left'
    ctx.fillText('|\u03C8|\u00B2', 8, baseline - waveHeight * 0.8)
    ctx.fillText('x', W - 16, baseline + fSz + 2)

    // ── Info: transmission probability ────────────────────────────────────
    const tProb = transmittedProb(state.re, state.im)
    const totProb = totalProb(state.re, state.im)
    const T = totProb > 0.01 ? tProb / totProb : 0

    const infoSz = Math.max(10, Math.round(W * 0.013))
    ctx.font = `${infoSz}px monospace`

    // Energy vs barrier
    const E = (params.energy as number) ?? 2
    const ratio = V0 > 0 ? E / V0 : Infinity
    ctx.fillStyle = 'rgba(96, 165, 250, 0.6)'
    ctx.textAlign = 'left'
    ctx.fillText(`E = ${E.toFixed(1)}`, 14, H - 38)
    ctx.fillStyle = 'rgba(200, 149, 90, 0.6)'
    ctx.fillText(`E/V\u2080 = ${ratio < 100 ? ratio.toFixed(2) : '\u221E'}`, 14, H - 22)

    // Transmission info (only show once packet has started interacting)
    if (state.t > 5) {
      ctx.fillStyle = 'rgba(176, 138, 240, 0.7)'
      ctx.textAlign = 'right'
      ctx.fillText(`T = ${(T * 100).toFixed(1)}%`, W - 14, H - 22)

      // Theoretical tunneling probability (WKB approximation, E < V0)
      if (E < V0) {
        const kappa = Math.sqrt(2 * (V0 - E))
        const Ttheory = Math.exp(-2 * kappa * L)
        ctx.fillStyle = 'rgba(240, 237, 232, 0.25)'
        ctx.fillText(`T(WKB) \u2248 ${(Ttheory * 100).toFixed(1)}%`, W - 14, H - 38)
      }
    }

    // Time display
    ctx.fillStyle = 'rgba(240, 237, 232, 0.18)'
    ctx.textAlign = 'right'
    ctx.fillText(`t = ${state.t.toFixed(1)}`, W - 14, 20 + infoSz)

    // Reset countdown
    if (state.finished) {
      ctx.fillStyle = 'rgba(200, 149, 90, 0.6)'
      ctx.textAlign = 'center'
      ctx.font = `${Math.max(12, Math.round(W * 0.016))}px monospace`
      ctx.fillText(
        `reset in ${Math.ceil(state.resetTimer)}s`,
        W / 2,
        H * 0.92,
      )
    }

    // Reset text align
    ctx.textAlign = 'left'
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'barrierHeight',
        label: '势垒高度',
        labelEn: 'Barrier height',
        min: 0,
        max: 8,
        step: 0.5,
        default: 3,
      },
      {
        type: 'slider',
        id: 'barrierWidth',
        label: '势垒宽度',
        labelEn: 'Barrier width',
        min: 0.5,
        max: 5,
        step: 0.5,
        default: 2,
      },
      {
        type: 'slider',
        id: 'energy',
        label: '粒子能量',
        labelEn: 'Particle energy',
        min: 0.5,
        max: 6,
        step: 0.5,
        default: 2,
      },
      {
        type: 'slider',
        id: 'speed',
        label: '速度',
        labelEn: 'Speed',
        min: 0.5,
        max: 3,
        step: 0.5,
        default: 1,
      },
    ]
  },

  destroy() {},
}

export default QuantumTunneling

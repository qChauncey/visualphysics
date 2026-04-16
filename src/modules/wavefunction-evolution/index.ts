// ─────────────────────────────────────────────
//  Module: Wavefunction Evolution (1D TDSE)
//  Renderer: Canvas 2D
//  Physics: Time-Dependent Schrödinger Equation via leapfrog (Askar–Cakmak)
//  Units: atomic units (ħ = m = 1)
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Grid constants ────────────────────────────

const N   = 512      // grid points
const L   = 120.0    // box length (au)
const dx  = L / N    // ≈ 0.234 au
const dt  = 0.008    // time step (stable: dt < dx²)
const SUB = 30       // substeps per animation frame

const SIG   = 5.0    // initial Gaussian width (au)
const X0    = L / 4  // initial packet center
const ABS   = 55     // absorber region width (grid points)
const ABS_W = 0.25   // absorber strength

// ── Types ─────────────────────────────────────

type WaveState = {
  psiR:      Float64Array   // ψ_real at integer steps
  psiI_half: Float64Array   // ψ_imag at half-integer steps (staggered)
  V:         Float64Array   // potential V(x)
  absorb:    Float64Array   // absorb[i] ∈ [0, ABS_W]
  time:      number
  canvasW:   number
  canvasH:   number
  // track params to detect changes requiring rebuild
  lastK0:    number
  lastV0:    number
  lastBW:    number
  lastPot:   string
}

// ── Helpers ───────────────────────────────────

const _hTmp = new Float64Array(N)

/** H·ψ = -½ ∂²ψ/∂x² + V·ψ, Dirichlet BC */
function applyH(src: Float64Array, V: Float64Array, out: Float64Array) {
  for (let i = 0; i < N; i++) {
    const im = i > 0     ? src[i - 1] : 0.0
    const ip = i < N - 1 ? src[i + 1] : 0.0
    const lap = (im - 2 * src[i] + ip) / (dx * dx)
    out[i] = -0.5 * lap + V[i] * src[i]
  }
}

/** One Askar–Cakmak leapfrog step + absorber */
function step(state: WaveState) {
  const { psiR, psiI_half, V, absorb } = state

  // psiR += dt * H * psiI_half
  applyH(psiI_half, V, _hTmp)
  for (let i = 0; i < N; i++) {
    psiR[i] += dt * _hTmp[i]
    psiR[i] *= (1 - absorb[i])
  }

  // psiI_half -= dt * H * psiR
  applyH(psiR, V, _hTmp)
  for (let i = 0; i < N; i++) {
    psiI_half[i] -= dt * _hTmp[i]
    psiI_half[i] *= (1 - absorb[i])
  }
}

/** Build absorber profile */
function buildAbsorber(): Float64Array {
  const a = new Float64Array(N)
  for (let i = 0; i < ABS; i++) {
    const t = (ABS - i) / ABS
    const w = ABS_W * t * t * dt  // per-step absorption
    a[i]         = w
    a[N - 1 - i] = w
  }
  return a
}

/** Build potential */
function buildPotential(V0: number, barrierW: number, potType: string): Float64Array {
  const V = new Float64Array(N)
  const center = N / 2
  const halfPts = Math.round((barrierW / L) * N / 2)

  if (potType === 'none') return V

  for (let i = 0; i < N; i++) {
    const inBarrier = Math.abs(i - center) <= halfPts
    if (potType === 'barrier' && inBarrier)       V[i] =  V0
    if (potType === 'well'    && inBarrier)       V[i] = -V0
    if (potType === 'double') {
      const c1 = center - halfPts * 2
      const c2 = center + halfPts * 2
      const w  = Math.max(1, halfPts)
      if (Math.abs(i - c1) <= w || Math.abs(i - c2) <= w) V[i] = V0
    }
  }
  return V
}

/** Initialise normalised Gaussian wave packet */
function buildWave(k0: number, V: Float64Array): { psiR: Float64Array; psiI_half: Float64Array } {
  const psiR      = new Float64Array(N)
  const psiI_half = new Float64Array(N)

  // ψ(x,0) = A · exp(−(x−x₀)²/2σ²) · exp(ik₀x)
  let norm = 0
  for (let i = 0; i < N; i++) {
    const x   = i * dx
    const env = Math.exp(-((x - X0) ** 2) / (2 * SIG * SIG))
    psiR[i]      = env * Math.cos(k0 * x)
    psiI_half[i] = env * Math.sin(k0 * x)
    norm += (psiR[i] ** 2 + psiI_half[i] ** 2) * dx
  }
  const s = 1 / Math.sqrt(norm)
  for (let i = 0; i < N; i++) {
    psiR[i]      *= s
    psiI_half[i] *= s
  }

  // Stagger psiI_half back by dt/2: psiI_{-1/2} = psiI_0 - (dt/2) * H * psiR_0
  applyH(psiR, V, _hTmp)
  for (let i = 0; i < N; i++) {
    psiI_half[i] -= (dt / 2) * _hTmp[i]
  }

  return { psiR, psiI_half }
}

function makeState(
  canvas: HTMLElement, k0: number, V0: number,
  barrierW: number, potType: string,
  canvasW = 0, canvasH = 0
): WaveState {
  const el  = canvas as HTMLCanvasElement
  const cW  = canvasW  || el.clientWidth  || 800
  const cH  = canvasH  || el.clientHeight || 600
  const absorb = buildAbsorber()
  const V      = buildPotential(V0, barrierW, potType)
  const { psiR, psiI_half } = buildWave(k0, V)
  return { psiR, psiI_half, V, absorb, time: 0, canvasW: cW, canvasH: cH, lastK0: k0, lastV0: V0, lastBW: barrierW, lastPot: potType }
}

// ── Rendering helpers ─────────────────────────

/** Draw a smooth poly-line through points */
function polyLine(ctx: CanvasRenderingContext2D, xs: number[], ys: number[]) {
  ctx.beginPath()
  ctx.moveTo(xs[0], ys[0])
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i])
  ctx.stroke()
}

// ── Module ────────────────────────────────────

const WavefunctionEvolutionModule: PhysicsModule<WaveState> = {
  id: 'wavefunction-evolution',

  metadata: {
    title:       '波函数演化',
    titleEn:     'Wavefunction Evolution',
    description: '一维薛定谔方程的实时演化：高斯波包在势垒前的透射、反射与量子隧穿。',
    descriptionEn:
      'Real-time solution of the 1D time-dependent Schrödinger equation. ' +
      'A Gaussian wave packet propagates through a configurable potential barrier, ' +
      'exhibiting quantum tunneling, reflection, and interference.',
    theory:    ['quantum-mechanics'],
    mathLevel: 2,
    renderer:  'canvas2d',
    linkedModules: ['quantum-tunneling', 'hydrogen-orbital', 'double-slit'],
  },

  init(canvas, params): WaveState {
    const k0       = Number(params.momentum    ?? 2.5)
    const V0       = Number(params.barrierH    ?? 5.0)
    const barrierW = Number(params.barrierW    ?? 8)
    const potType  = String(params.potential   ?? 'barrier')
    return makeState(canvas, k0, V0, barrierW, potType)
  },

  tick(state, _dt, params): WaveState {
    const k0       = Number(params.momentum    ?? 2.5)
    const V0       = Number(params.barrierH    ?? 5.0)
    const barrierW = Number(params.barrierW    ?? 8)
    const potType  = String(params.potential   ?? 'barrier')

    // Reset
    if (params.reset === true ||
        k0      !== state.lastK0 ||
        potType !== state.lastPot) {
      return makeState(
        { clientWidth: state.canvasW, clientHeight: state.canvasH } as unknown as HTMLElement,
        k0, V0, barrierW, potType,
        state.canvasW, state.canvasH
      )
    }

    // Rebuild potential if barrier params changed (keep wavepacket)
    if (V0 !== state.lastV0 || barrierW !== state.lastBW) {
      state.V      = buildPotential(V0, barrierW, potType)
      state.lastV0 = V0
      state.lastBW = barrierW
    }

    for (let s = 0; s < SUB; s++) step(state)
    state.time += dt * SUB

    return state
  },

  render(state, canvas, params): void {
    const el = canvas as HTMLCanvasElement
    const W  = el.width  = el.clientWidth
    const H  = el.height = el.clientHeight
    state.canvasW = W
    state.canvasH = H

    const ctx = el.getContext('2d')
    if (!ctx) return

    const { psiR, psiI_half, V } = state
    const showRe  = params.showRe  !== false
    const showIm  = params.showIm  !== false
    const showProb = params.showProb !== false

    // ── Background ────────────────────────────
    ctx.fillStyle = '#05050e'
    ctx.fillRect(0, 0, W, H)

    // ── Layout ────────────────────────────────
    const yBase     = H * 0.82      // baseline y (prob=0, ψ=0)
    const probScale = H * 4.5       // pixels per unit of |ψ|²
    const ampScale  = H * 1.35      // pixels per unit of Re/Im amplitude

    // ── Potential barrier ──────────────────────
    const V0       = Number(params.barrierH   ?? 5.0)
    const potType  = String(params.potential  ?? 'barrier')

    if (potType !== 'none' && V0 > 0) {
      // V scale: max V → H * 0.18
      const vScale = (H * 0.18) / V0
      ctx.lineWidth = 0
      for (let i = 0; i < N; i++) {
        if (V[i] === 0) continue
        const cx = (i / N) * W
        const vH = Math.abs(V[i]) * vScale
        if (V[i] > 0) {
          ctx.fillStyle = 'rgba(200,149,90,0.18)'
          ctx.fillRect(cx, yBase - vH, W / N + 1, vH)
        } else {
          ctx.fillStyle = 'rgba(96,165,250,0.15)'
          ctx.fillRect(cx, yBase, W / N + 1, vH)
        }
      }
      // Barrier outline
      ctx.strokeStyle = V[N / 2] > 0 ? 'rgba(200,149,90,0.45)' : 'rgba(96,165,250,0.45)'
      ctx.lineWidth = 1
      let inPot = false
      for (let i = 0; i <= N; i++) {
        const vi = i < N ? V[i] : 0
        if (vi !== 0 && !inPot) {
          inPot = true
          const cx = (i / N) * W
          const vH = Math.abs(vi) * vScale
          ctx.beginPath()
          ctx.moveTo(cx, yBase)
          ctx.lineTo(cx, vi > 0 ? yBase - vH : yBase + vH)
        }
        if ((vi === 0 || i === N) && inPot) {
          inPot = false
          const cx = (i / N) * W
          const vH = Math.abs(V[i - 1]) * vScale
          ctx.lineTo(cx, V[i-1] > 0 ? yBase - vH : yBase + vH)
          ctx.lineTo(cx, yBase)
          ctx.stroke()
        }
      }
    }

    // ── Baseline ──────────────────────────────
    ctx.strokeStyle = 'rgba(240,237,232,0.10)'
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 8])
    ctx.beginPath()
    ctx.moveTo(0, yBase); ctx.lineTo(W, yBase)
    ctx.stroke()
    ctx.setLineDash([])

    // ── |ψ|² probability density ──────────────
    if (showProb) {
      ctx.beginPath()
      ctx.moveTo(0, yBase)
      for (let i = 0; i < N; i++) {
        const cx   = (i / N) * W
        const prob = psiR[i] * psiR[i] + psiI_half[i] * psiI_half[i]
        ctx.lineTo(cx, yBase - prob * probScale)
      }
      ctx.lineTo(W, yBase)
      ctx.closePath()

      const grad = ctx.createLinearGradient(0, yBase * 0.4, 0, yBase)
      grad.addColorStop(0,   'rgba(200,149,90,0.75)')
      grad.addColorStop(0.7, 'rgba(200,149,90,0.25)')
      grad.addColorStop(1,   'rgba(200,149,90,0.00)')
      ctx.fillStyle = grad
      ctx.fill()

      // Outline
      ctx.beginPath()
      for (let i = 0; i < N; i++) {
        const cx   = (i / N) * W
        const prob = psiR[i] * psiR[i] + psiI_half[i] * psiI_half[i]
        if (i === 0) ctx.moveTo(cx, yBase - prob * probScale)
        else         ctx.lineTo(cx, yBase - prob * probScale)
      }
      ctx.strokeStyle = 'rgba(200,149,90,0.90)'
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }

    // ── Re(ψ) ─────────────────────────────────
    if (showRe) {
      const reXs: number[] = []
      const reYs: number[] = []
      for (let i = 0; i < N; i++) {
        reXs.push((i / N) * W)
        reYs.push(yBase - psiR[i] * ampScale)
      }
      ctx.strokeStyle = 'rgba(96,165,250,0.75)'
      ctx.lineWidth   = 1.5
      polyLine(ctx, reXs, reYs)
    }

    // ── Im(ψ) ─────────────────────────────────
    if (showIm) {
      const imXs: number[] = []
      const imYs: number[] = []
      for (let i = 0; i < N; i++) {
        imXs.push((i / N) * W)
        imYs.push(yBase - psiI_half[i] * ampScale)
      }
      ctx.strokeStyle = 'rgba(52,211,153,0.65)'
      ctx.lineWidth   = 1.5
      polyLine(ctx, imXs, imYs)
    }

    // ── Labels ────────────────────────────────
    ctx.font      = '11px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.32)'
    ctx.textAlign = 'left'

    // Compute norm and kinetic energy for readout
    let norm = 0, ke = 0
    for (let i = 0; i < N; i++) {
      const prob = psiR[i] * psiR[i] + psiI_half[i] * psiI_half[i]
      norm += prob * dx
    }
    const k0 = Number(params.momentum ?? 2.5)
    const E  = (k0 * k0) / 2

    ctx.fillText(`t = ${state.time.toFixed(1)} au`, 14, 20)
    ctx.fillText(`E = ${E.toFixed(2)} au  |  ∫|ψ|²dx = ${norm.toFixed(3)}`, 14, 36)

    // Legend
    const lx = W - 160
    if (showProb) {
      ctx.fillStyle = 'rgba(200,149,90,0.80)'; ctx.fillRect(lx, H - 58, 20, 3)
      ctx.fillStyle = 'rgba(240,237,232,0.38)'; ctx.fillText('|ψ|²  probability', lx + 26, H - 52)
    }
    if (showRe) {
      ctx.fillStyle = 'rgba(96,165,250,0.80)';  ctx.fillRect(lx, H - 40, 20, 2)
      ctx.fillStyle = 'rgba(240,237,232,0.38)'; ctx.fillText('Re(ψ)', lx + 26, H - 34)
    }
    if (showIm) {
      ctx.fillStyle = 'rgba(52,211,153,0.70)';  ctx.fillRect(lx, H - 22, 20, 2)
      ctx.fillStyle = 'rgba(240,237,232,0.38)'; ctx.fillText('Im(ψ)', lx + 26, H - 16)
    }
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'momentum',
        label: '初始动量 k₀',
        labelEn: 'Momentum k₀',
        min: 0.5, max: 4.0, step: 0.25, default: 2.5,
      },
      {
        type: 'select',
        id: 'potential',
        label: '势场类型',
        labelEn: 'Potential Type',
        options: [
          { value: 'barrier', label: '势垒',   labelEn: 'Barrier' },
          { value: 'well',    label: '势阱',   labelEn: 'Well' },
          { value: 'double',  label: '双势垒', labelEn: 'Double Barrier' },
          { value: 'none',    label: '自由',   labelEn: 'Free' },
        ],
        default: 'barrier',
      },
      {
        type: 'slider',
        id: 'barrierH',
        label: '势垒高度 V₀',
        labelEn: 'Barrier Height V₀',
        min: 0, max: 15, step: 0.5, default: 5.0,
      },
      {
        type: 'slider',
        id: 'barrierW',
        label: '势垒宽度',
        labelEn: 'Barrier Width',
        min: 1, max: 30, step: 1, default: 8,
      },
      {
        type: 'toggle',
        id: 'showProb',
        label: '显示 |ψ|²',
        labelEn: 'Show |ψ|²',
        default: true,
      },
      {
        type: 'toggle',
        id: 'showRe',
        label: '显示 Re(ψ)',
        labelEn: 'Show Re(ψ)',
        default: true,
      },
      {
        type: 'toggle',
        id: 'showIm',
        label: '显示 Im(ψ)',
        labelEn: 'Show Im(ψ)',
        default: false,
      },
      {
        type: 'button',
        id: 'reset',
        label: '重置',
        labelEn: 'Reset',
      },
    ]
  },

  destroy(_canvas): void {
    // nothing to clean up
  },
}

export default WavefunctionEvolutionModule

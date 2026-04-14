// Double Slit Experiment — quantum wave-particle duality
// Fires "particles" one at a time; they accumulate on the detector screen
// following the quantum probability distribution  |ψ|² = I(θ).
//
// WITHOUT observation: double-slit interference pattern (wave behaviour).
// WITH    observation: two classical Gaussian peaks (particle behaviour).
//
// Physics:  I(θ) = sinc²(πa sinθ/λ) · cos²(πd sinθ/λ)
//   a = slit width, d = slit centre-to-centre, λ = wavelength (in px units)
//   All lengths are normalised so the screen height = 1.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── State ─────────────────────────────────────────────────────────────────────

type Particle = {
  /** start x (at gun, left edge) */
  x0: number
  /** starting y (varies slightly — gun emits a wide beam) */
  y0: number
  /** final landing y on the screen, pre-sampled from |ψ|² */
  yFinal: number
  /** fraction 0→1 of how far along the flight it is */
  t: number
  /** flight speed (fraction per frame) */
  speed: number
  /** which slit it passed through (for observed mode) */
  slit: 0 | 1
}

type SlitState = {
  ctx:         CanvasRenderingContext2D
  particles:   Particle[]
  /** accumulated hit density — Float32 per y pixel bin on the screen */
  hits:        Float32Array
  hitBins:     number
  frame:       number
  /** cumulative max hit count, for colour scaling */
  maxHit:      number
  /** cached CDF for the CURRENT params (rebuilt when params change) */
  cachedCDF:   Float32Array | null
  cdfParamKey: string
}

// ── Probability distributions ─────────────────────────────────────────────────

/** Sinc²(x) — single-slit diffraction envelope */
function sinc2(x: number) {
  if (Math.abs(x) < 1e-9) return 1
  const s = Math.sin(x) / x
  return s * s
}

/**
 * Double-slit intensity at screen position y ∈ [-0.5, 0.5] (normalised height).
 * L = distance slit→screen (normalised), a = slit width, d = slit sep, lambda = wavelength.
 * All in the same length unit (screen height = 1).
 */
function intensity(
  y:      number,
  a:      number,
  d:      number,
  lambda: number,
  L:      number,
  observed: boolean,
): number {
  if (observed) {
    // Each slit acts as a point source — two Gaussian peaks
    const sigma = 0.06
    const y1 =  d / 2
    const y2 = -d / 2
    const g1 = Math.exp(-((y - y1) ** 2) / (2 * sigma ** 2))
    const g2 = Math.exp(-((y - y2) ** 2) / (2 * sigma ** 2))
    return g1 + g2
  }

  const sinTheta = y / Math.sqrt(y * y + L * L)
  const beta     = Math.PI * a * sinTheta / lambda
  const delta    = Math.PI * d * sinTheta / lambda
  return sinc2(beta) * Math.cos(delta) ** 2
}

/** Build a CDF over N bins so we can inverse-sample landing positions */
function buildCDF(
  bins:     number,
  a:        number,
  d:        number,
  lambda:   number,
  L:        number,
  observed: boolean,
): Float32Array {
  const cdf = new Float32Array(bins + 1)
  let sum = 0
  for (let i = 0; i < bins; i++) {
    const y = (i / bins - 0.5)
    sum += intensity(y, a, d, lambda, L, observed)
    cdf[i + 1] = sum
  }
  // Normalise
  if (sum > 0) for (let i = 0; i <= bins; i++) cdf[i] /= sum
  return cdf
}

/** Sample a y ∈ [0, bins) from the CDF via binary search */
function sampleCDF(cdf: Float32Array): number {
  const u = Math.random()
  let lo = 0, hi = cdf.length - 2
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (cdf[mid + 1] < u) lo = mid + 1
    else hi = mid
  }
  // Linear interpolation within the bin
  const t = cdf[lo] < cdf[lo + 1]
    ? (u - cdf[lo]) / (cdf[lo + 1] - cdf[lo])
    : 0
  return lo + t
}

// ── Layout constants (all in [0,1] normalised canvas space) ─────────────────

const GUN_X    = 0.04   // particle emitter
const SLIT_X   = 0.38   // barrier with slits
const SCREEN_X = 0.92   // detector screen

// ── Module ────────────────────────────────────────────────────────────────────

const DoubleSlit: PhysicsModule<SlitState> = {
  id: 'double-slit',

  metadata: {
    title:       '双缝实验',
    titleEn:     'Double Slit',
    description: '单个粒子逐一通过双缝，却在屏幕上累积出干涉条纹——量子测量与波函数坍缩的最直观演示。',
    theory:      ['quantum-mechanics'],
    mathLevel:   2,
    renderer:    'canvas2d',
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(canvas, params): SlitState {
    const ctx      = (canvas as HTMLCanvasElement).getContext('2d')!
    const hitBins  = 600
    return {
      ctx,
      particles:   [],
      hits:        new Float32Array(hitBins),
      hitBins,
      frame:       0,
      maxHit:      0,
      cachedCDF:   null,
      cdfParamKey: '',
    }
  },

  tick(state, _dt, params): SlitState {
    const observed = params.observed as boolean
    const lambda   = params.lambda   as number   // 0.01..0.06
    const slitW    = params.slitW    as number   // slit width (normalised)
    const slitD    = params.slitD    as number   // centre-to-centre sep
    const rate     = params.rate     as number   // particles per frame

    // Rebuild CDF when params change
    const key = `${observed}|${lambda}|${slitW}|${slitD}`
    let cdf = state.cachedCDF
    if (state.cdfParamKey !== key || !cdf) {
      cdf = buildCDF(state.hitBins, slitW, slitD, lambda, SCREEN_X - SLIT_X, observed)
    }

    // Spawn new particles
    const newParticles = [...state.particles]
    for (let i = 0; i < rate; i++) {
      const bin    = sampleCDF(cdf)
      const yFinal = (bin / state.hitBins - 0.5)  // normalised -0.5..0.5
      const slit   = Math.random() < 0.5 ? 0 : 1 as 0 | 1
      newParticles.push({
        x0:     GUN_X,
        y0:     (slit === 0 ? 0.5 + slitD / 2 : 0.5 - slitD / 2) + (Math.random() - 0.5) * slitW,
        yFinal: yFinal + 0.5,   // shift to 0..1
        t:      0,
        speed:  0.025 + Math.random() * 0.015,
        slit,
      })
    }

    // Advance particles
    const hits       = new Float32Array(state.hits)
    let   maxHit     = state.maxHit
    const surviving: Particle[] = []

    for (const p of newParticles) {
      const t = p.t + p.speed
      if (t >= 1) {
        // Landed — add to heatmap
        const bin = Math.floor(p.yFinal * state.hitBins)
        if (bin >= 0 && bin < state.hitBins) {
          hits[bin] += 1
          if (hits[bin] > maxHit) maxHit = hits[bin]
        }
      } else {
        surviving.push({ ...p, t })
      }
    }

    return {
      ...state,
      particles:   surviving,
      hits,
      maxHit,
      frame:       state.frame + 1,
      cachedCDF:   cdf,
      cdfParamKey: key,
    }
  },

  render(state, canvas, params) {
    const ctx      = state.ctx
    const el       = canvas as HTMLCanvasElement
    const W        = el.width
    const H        = el.height
    const observed = params.observed as boolean
    const slitD    = params.slitD    as number
    const slitW    = params.slitW    as number

    // Background
    ctx.fillStyle = '#030308'
    ctx.fillRect(0, 0, W, H)

    const px  = (x: number) => x * W
    const py  = (y: number) => y * H

    // ── Heatmap on detector screen ─────────────────────────────────────────
    if (state.maxHit > 0) {
      const scrX  = px(SCREEN_X)
      const barW  = Math.max(3, W * 0.04)
      const binH  = H / state.hitBins

      for (let b = 0; b < state.hitBins; b++) {
        const v = state.hits[b] / state.maxHit
        if (v < 0.001) continue
        const logV = Math.log1p(v * 15) / Math.log1p(15)

        // Colour: dark blue → cyan → white (quantum aesthetic)
        let r, g, bl
        if (logV < 0.5) {
          const t = logV / 0.5
          r = Math.round(10  + 30  * t)
          g = Math.round(20  + 160 * t)
          bl= Math.round(80  + 155 * t)
        } else {
          const t = (logV - 0.5) / 0.5
          r = Math.round(40  + 215 * t)
          g = Math.round(180 + 75  * t)
          bl= Math.round(235 + 20  * t)
        }
        ctx.fillStyle = `rgb(${r},${g},${bl})`
        ctx.fillRect(scrX, b * binH, barW, binH + 1)
      }
    }

    // ── Barrier ────────────────────────────────────────────────────────────
    const bx    = px(SLIT_X)
    const cy    = H / 2
    const half1 = py(slitD / 2 + slitW / 2)
    const half2 = py(slitD / 2 - slitW / 2)

    ctx.fillStyle = 'rgba(180,190,210,0.18)'
    // top block
    ctx.fillRect(bx - 2, 0, 4, cy - half1)
    // middle block (between slits)
    ctx.fillRect(bx - 2, cy - half2, 4, half2 * 2)
    // bottom block
    ctx.fillRect(bx - 2, cy + half1, 4, H - (cy + half1))

    // Slit glow
    const slitGrad = ctx.createLinearGradient(bx - 8, 0, bx + 8, 0)
    slitGrad.addColorStop(0,   'rgba(100,200,255,0)')
    slitGrad.addColorStop(0.5, 'rgba(100,200,255,0.18)')
    slitGrad.addColorStop(1,   'rgba(100,200,255,0)')
    ctx.fillStyle = slitGrad
    ctx.fillRect(bx - 8, cy - half1, 16, slitW * 2)    // upper slit glow
    ctx.fillRect(bx - 8, cy + half2, 16, slitW * 2)    // lower slit glow (wrong — fix below)

    // ── Flying particles ───────────────────────────────────────────────────
    for (const p of state.particles) {
      // Ease-in-out x motion; y lerps y0 → yFinal
      const ease = p.t < 0.5
        ? 2 * p.t * p.t
        : 1 - Math.pow(-2 * p.t + 2, 2) / 2
      const x = GUN_X + (SCREEN_X - GUN_X) * ease
      const y = p.y0 + (p.yFinal - p.y0) * ease

      const alpha = p.t < 0.2 ? p.t / 0.2 : p.t > 0.85 ? (1 - p.t) / 0.15 : 1

      ctx.beginPath()
      ctx.arc(px(x), py(y), 1.8, 0, Math.PI * 2)
      ctx.fillStyle = observed
        ? `rgba(255,160,80,${alpha * 0.9})`
        : `rgba(80,200,255,${alpha * 0.9})`
      ctx.fill()
    }

    // ── Screen line ────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(180,190,210,0.22)'
    ctx.lineWidth   = 1
    ctx.beginPath()
    ctx.moveTo(px(SCREEN_X), 0)
    ctx.lineTo(px(SCREEN_X), H)
    ctx.stroke()

    // ── Labels ─────────────────────────────────────────────────────────────
    const fSz = Math.max(9, Math.round(W * 0.012))
    ctx.font      = `${fSz}px monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.fillText('source',  px(GUN_X)    - 10, H - 10)
    ctx.fillText('barrier', px(SLIT_X)   - 16, H - 10)
    ctx.fillText('screen',  px(SCREEN_X) + 4,  H - 10)

    // Observation state
    const statusSz = Math.max(10, Math.round(W * 0.014))
    ctx.font = `${statusSz}px monospace`
    if (observed) {
      ctx.fillStyle = 'rgba(255,160,80,0.70)'
      ctx.fillText('● observed — particle behaviour', 14, 20 + statusSz)
    } else {
      ctx.fillStyle = 'rgba(80,200,255,0.70)'
      ctx.fillText('● unobserved — wave behaviour', 14, 20 + statusSz)
    }

    // Particle count
    const total = state.hits.reduce((s, v) => s + v, 0)
    ctx.font      = `${fSz}px monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(total).toLocaleString()} particles`, W - 12, 20 + fSz)
    ctx.textAlign = 'left'
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'toggle',
        id:      'observed',
        label:   '观测（坍缩波函数）',
        default: false,
      },
      {
        type:    'slider',
        id:      'lambda',
        label:   '波长 λ',
        min:     0.01,
        max:     0.08,
        step:    0.005,
        default: 0.032,
      },
      {
        type:    'slider',
        id:      'slitD',
        label:   '缝间距 d',
        min:     0.05,
        max:     0.30,
        step:    0.01,
        default: 0.14,
      },
      {
        type:    'slider',
        id:      'slitW',
        label:   '缝宽 a',
        min:     0.01,
        max:     0.08,
        step:    0.005,
        default: 0.025,
      },
      {
        type:    'slider',
        id:      'rate',
        label:   '发射速率',
        min:     1,
        max:     20,
        step:    1,
        default: 6,
      },
      {
        type:    'button',
        id:      'reset',
        label:   'Clear Screen',
      },
    ]
  },

  destroy() {},
}

export default DoubleSlit

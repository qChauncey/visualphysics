// Blackbody Radiation — Planck's law spectral curves
// Visualises the spectral radiance B(lambda, T) at different temperatures,
// with a glowing body whose colour tracks the blackbody colour for T.
//
// Physics:
//   B(lambda, T) = (2 h c^2 / lambda^5) / (exp(h c / (lambda k T)) - 1)
//   Wien's displacement:  lambda_max = b / T,  b = 2.8977729e-3 m K
//   Stefan-Boltzmann:     P = sigma T^4
//
// All internal computation uses SI units (metres, Kelvin).
// Display uses nm on the x-axis and normalised intensity on y.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Physical constants (SI) ──────────────────────────────────────────────────

const h  = 6.62607015e-34   // Planck constant (J s)
const c  = 2.99792458e8     // speed of light (m/s)
const kB = 1.380649e-23     // Boltzmann constant (J/K)
const b  = 2.8977729e-3     // Wien displacement constant (m K)

// ── Wavelength grid ──────────────────────────────────────────────────────────

const LAMBDA_MIN_NM = 100
const LAMBDA_MAX_NM = 2500
const N_LAMBDA      = 600   // number of sample points

/** Wavelength array in metres */
const lambdas: number[] = []
for (let i = 0; i < N_LAMBDA; i++) {
  const nm = LAMBDA_MIN_NM + (LAMBDA_MAX_NM - LAMBDA_MIN_NM) * i / (N_LAMBDA - 1)
  lambdas.push(nm * 1e-9)
}

// ── Planck function ──────────────────────────────────────────────────────────

/** Spectral radiance B(lambda, T) in W sr^-1 m^-3 */
function planck(lambda: number, T: number): number {
  const a = 2 * h * c * c / (lambda ** 5)
  const exponent = h * c / (lambda * kB * T)
  // clamp exponent to avoid Infinity
  if (exponent > 500) return 0
  return a / (Math.exp(exponent) - 1)
}

/** Compute Planck curve across wavelength grid, return values array */
function computeCurve(T: number): number[] {
  const vals: number[] = new Array(N_LAMBDA)
  for (let i = 0; i < N_LAMBDA; i++) {
    vals[i] = planck(lambdas[i], T)
  }
  return vals
}

// ── Blackbody colour approximation ───────────────────────────────────────────
// Based on CIE 1931 chromaticity + Planckian locus approximation.
// We use a piecewise polynomial fit similar to Tanner Helland's method,
// refined with data from Mitchell Charity's blackbody colour table.

function blackbodyRGB(T: number): [number, number, number] {
  // Clamp temperature
  const t = Math.max(1000, Math.min(40000, T)) / 100

  let r: number, g: number, bl: number

  // Red
  if (t <= 66) {
    r = 255
  } else {
    r = 329.698727446 * Math.pow(t - 60, -0.1332047592)
  }

  // Green
  if (t <= 66) {
    g = 99.4708025861 * Math.log(t) - 161.1195681661
  } else {
    g = 288.1221695283 * Math.pow(t - 60, -0.0755148492)
  }

  // Blue
  if (t >= 66) {
    bl = 255
  } else if (t <= 19) {
    bl = 0
  } else {
    bl = 138.5177312231 * Math.log(t - 10) - 305.0447927307
  }

  r  = Math.max(0, Math.min(255, Math.round(r)))
  g  = Math.max(0, Math.min(255, Math.round(g)))
  bl = Math.max(0, Math.min(255, Math.round(bl)))

  return [r, g, bl]
}

// ── Visible spectrum wavelength → RGB ────────────────────────────────────────
// Attempt to map wavelength (nm) to an approximate visible colour.

function wavelengthToRGB(nm: number): [number, number, number] {
  let r = 0, g = 0, bl = 0

  if (nm >= 380 && nm < 440) {
    r  = -(nm - 440) / (440 - 380)
    bl = 1
  } else if (nm >= 440 && nm < 490) {
    g  = (nm - 440) / (490 - 440)
    bl = 1
  } else if (nm >= 490 && nm < 510) {
    g  = 1
    bl = -(nm - 510) / (510 - 490)
  } else if (nm >= 510 && nm < 580) {
    r  = (nm - 510) / (580 - 510)
    g  = 1
  } else if (nm >= 580 && nm < 645) {
    r  = 1
    g  = -(nm - 645) / (645 - 580)
  } else if (nm >= 645 && nm <= 700) {
    r  = 1
  }

  // Intensity fall-off at edges of visible range
  let factor: number
  if (nm >= 380 && nm < 420) {
    factor = 0.3 + 0.7 * (nm - 380) / (420 - 380)
  } else if (nm >= 645 && nm <= 700) {
    factor = 0.3 + 0.7 * (700 - nm) / (700 - 645)
  } else if (nm >= 420 && nm < 645) {
    factor = 1
  } else {
    factor = 0
  }

  return [
    Math.round(255 * r * factor),
    Math.round(255 * g * factor),
    Math.round(255 * bl * factor),
  ]
}

// ── Particle type for emission effect ────────────────────────────────────────

type EmitParticle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number      // 0→1 remaining
  decay: number     // how fast it decays per second
  size: number
}

// ── State ────────────────────────────────────────────────────────────────────

type BBState = {
  ctx: CanvasRenderingContext2D
  lastTemp: number
  curve: number[]        // precomputed Planck values at current temp
  peakLambda: number     // Wien peak wavelength in nm
  t: number              // animation time for glow pulsation
  emitParticles: EmitParticle[]
}

// ── Reference temperatures ───────────────────────────────────────────────────

const REF_TEMPS = [3000, 5000, 8000, 15000]

// ── Module ───────────────────────────────────────────────────────────────────

const BlackbodyRadiation: PhysicsModule<BBState> = {
  id: 'blackbody-radiation',

  metadata: {
    title:         '黑体辐射',
    titleEn:       'Blackbody Radiation',
    description:   '普朗克黑体辐射公式——温度决定辐射谱的形状与峰值波长，量子力学的起点。',
    descriptionEn: "Planck's blackbody radiation law — temperature determines the spectral shape and peak wavelength. The birth of quantum mechanics.",
    theory:        ['quantum-mechanics', 'thermodynamics'],
    mathLevel:     1,
    renderer:      'canvas2d',
  },

  // ── Lifecycle ────────────────────────────────────────────────────────────

  init(canvas, params): BBState {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!
    const T   = (params.temperature as number) || 5500
    return {
      ctx,
      lastTemp:      T,
      curve:         computeCurve(T),
      peakLambda:    (b / T) * 1e9,
      t:             0,
      emitParticles: [],
    }
  },

  tick(state, dt, params): BBState {
    const T = (params.temperature as number) || 5500

    // Recompute curve if temperature changed
    let curve      = state.curve
    let peakLambda = state.peakLambda
    if (T !== state.lastTemp) {
      curve      = computeCurve(T)
      peakLambda = (b / T) * 1e9
    }

    // Advance animation time
    const t = state.t + dt

    // Update emission particles
    let particles = state.emitParticles
      .map(p => ({
        ...p,
        x:    p.x + p.vx * dt,
        y:    p.y + p.vy * dt,
        life: p.life - p.decay * dt,
      }))
      .filter(p => p.life > 0)

    // Spawn new particles — rate proportional to T^4 (Stefan-Boltzmann)
    const spawnRate = Math.min(8, Math.max(1, Math.round((T / 5000) ** 2 * 3)))
    for (let i = 0; i < spawnRate; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 30 + Math.random() * 80
      particles.push({
        x:     0,   // relative to glow centre, will be offset in render
        y:     0,
        vx:    Math.cos(angle) * speed,
        vy:    Math.sin(angle) * speed,
        life:  1,
        decay: 0.8 + Math.random() * 1.2,
        size:  1 + Math.random() * 2,
      })
    }

    return {
      ...state,
      lastTemp:      T,
      curve,
      peakLambda,
      t,
      emitParticles: particles,
    }
  },

  render(state, canvas, params) {
    const ctx = state.ctx
    const el  = canvas as HTMLCanvasElement
    const W   = el.width
    const H   = el.height
    const T   = (params.temperature as number) || 5500
    const showRef  = params.showReference !== false
    const logScale = params.logScale as boolean

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#060810'
    ctx.fillRect(0, 0, W, H)

    // ── Layout ──────────────────────────────────────────────────────────────
    const plotTop    = H * 0.50
    const plotBottom = H * 0.92
    const plotLeft   = W * 0.08
    const plotRight  = W * 0.94
    const plotH      = plotBottom - plotTop
    const plotW      = plotRight  - plotLeft

    // ── Blackbody colour ────────────────────────────────────────────────────
    const [bbR, bbG, bbB] = blackbodyRGB(T)

    // ── Glowing body (top half) ─────────────────────────────────────────────
    const glowCX   = W * 0.5
    const glowCY   = H * 0.26
    const glowR    = Math.min(W, H) * 0.12

    // Pulsation
    const pulse = 1 + 0.03 * Math.sin(state.t * 2.5)

    // Outer halo
    const haloR = glowR * 2.5 * pulse
    const haloGrad = ctx.createRadialGradient(glowCX, glowCY, glowR * 0.3, glowCX, glowCY, haloR)
    haloGrad.addColorStop(0,   `rgba(${bbR},${bbG},${bbB},0.25)`)
    haloGrad.addColorStop(0.5, `rgba(${bbR},${bbG},${bbB},0.06)`)
    haloGrad.addColorStop(1,   `rgba(${bbR},${bbG},${bbB},0)`)
    ctx.fillStyle = haloGrad
    ctx.beginPath()
    ctx.arc(glowCX, glowCY, haloR, 0, Math.PI * 2)
    ctx.fill()

    // Main sphere glow
    const sphereR = glowR * pulse
    const grad = ctx.createRadialGradient(glowCX, glowCY, 0, glowCX, glowCY, sphereR)
    grad.addColorStop(0,   `rgba(255,255,255,0.95)`)
    grad.addColorStop(0.2, `rgba(${Math.min(255, bbR + 40)},${Math.min(255, bbG + 30)},${Math.min(255, bbB + 20)},0.9)`)
    grad.addColorStop(0.6, `rgba(${bbR},${bbG},${bbB},0.7)`)
    grad.addColorStop(1,   `rgba(${bbR},${bbG},${bbB},0)`)
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(glowCX, glowCY, sphereR, 0, Math.PI * 2)
    ctx.fill()

    // ── Emission particles ──────────────────────────────────────────────────
    for (const p of state.emitParticles) {
      const px = glowCX + p.x
      const py = glowCY + p.y
      const alpha = p.life * 0.7
      ctx.fillStyle = `rgba(${bbR},${bbG},${bbB},${alpha.toFixed(3)})`
      ctx.beginPath()
      ctx.arc(px, py, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
    }

    // ── Temperature label above glow ────────────────────────────────────────
    const tempFontSz = Math.max(12, Math.round(W * 0.022))
    ctx.font      = `${tempFontSz}px monospace`
    ctx.fillStyle = `rgba(${bbR},${bbG},${bbB},0.9)`
    ctx.textAlign = 'center'
    ctx.fillText(`T = ${T.toLocaleString()} K`, glowCX, glowCY + sphereR + tempFontSz + 8)

    // ── Visible spectrum band ───────────────────────────────────────────────
    const bandH = Math.max(6, plotH * 0.04)
    const bandY = plotBottom + 2
    for (let px = 0; px < plotW; px++) {
      const nm = LAMBDA_MIN_NM + (LAMBDA_MAX_NM - LAMBDA_MIN_NM) * px / plotW
      if (nm < 380 || nm > 700) continue
      const [sr, sg, sb] = wavelengthToRGB(nm)
      ctx.fillStyle = `rgb(${sr},${sg},${sb})`
      ctx.fillRect(plotLeft + px, bandY, 2, bandH)
    }

    // ── Compute all curves to find global max for scaling ───────────────────
    const refCurves: number[][] = []
    let globalMax = 0

    // Current temperature curve
    for (let i = 0; i < N_LAMBDA; i++) {
      if (state.curve[i] > globalMax) globalMax = state.curve[i]
    }

    // Reference curves
    if (showRef) {
      for (const rt of REF_TEMPS) {
        if (rt === T) {
          refCurves.push([])
          continue
        }
        const rc = computeCurve(rt)
        refCurves.push(rc)
        for (let i = 0; i < N_LAMBDA; i++) {
          if (rc[i] > globalMax) globalMax = rc[i]
        }
      }
    }

    if (globalMax < 1e-20) globalMax = 1  // avoid div by zero

    // Mapping function: value → pixel y
    const mapY = (v: number): number => {
      if (v <= 0) return plotBottom
      if (logScale) {
        // Map log scale: log(v/globalMax) in [-8, 0] → plotBottom..plotTop
        const logVal = Math.log10(v / globalMax)
        const clamped = Math.max(-8, logVal)
        return plotBottom + (clamped / -8) * (-plotH)  // -8 → bottom, 0 → top
      }
      return plotBottom - (v / globalMax) * plotH * 0.95
    }

    const mapX = (i: number): number => {
      return plotLeft + (i / (N_LAMBDA - 1)) * plotW
    }

    // ── Draw reference curves ───────────────────────────────────────────────
    if (showRef) {
      for (let ri = 0; ri < REF_TEMPS.length; ri++) {
        const rc = refCurves[ri]
        if (!rc || rc.length === 0) continue
        const rt = REF_TEMPS[ri]
        const [rr, rg, rb] = blackbodyRGB(rt)

        ctx.strokeStyle = `rgba(${rr},${rg},${rb},0.30)`
        ctx.lineWidth   = 1
        ctx.setLineDash([])
        ctx.beginPath()
        let started = false
        for (let i = 0; i < N_LAMBDA; i++) {
          const x = mapX(i)
          const y = mapY(rc[i])
          if (!started) { ctx.moveTo(x, y); started = true }
          else ctx.lineTo(x, y)
        }
        ctx.stroke()

        // Label for reference curve — find peak
        let peakIdx = 0, peakVal = 0
        for (let i = 0; i < N_LAMBDA; i++) {
          if (rc[i] > peakVal) { peakVal = rc[i]; peakIdx = i }
        }
        const labelX = mapX(peakIdx)
        const labelY = mapY(peakVal) - 6
        const refFsz = Math.max(8, Math.round(W * 0.010))
        ctx.font      = `${refFsz}px monospace`
        ctx.fillStyle = `rgba(${rr},${rg},${rb},0.50)`
        ctx.textAlign = 'center'
        ctx.fillText(`${rt.toLocaleString()} K`, labelX, Math.max(plotTop + refFsz, labelY))
      }
    }

    // ── Draw main curve (filled area with spectral gradient) ────────────────
    // Build path
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(mapX(0), plotBottom)
    for (let i = 0; i < N_LAMBDA; i++) {
      ctx.lineTo(mapX(i), mapY(state.curve[i]))
    }
    ctx.lineTo(mapX(N_LAMBDA - 1), plotBottom)
    ctx.closePath()

    // Fill with gradient tinted by blackbody colour
    const fillGrad = ctx.createLinearGradient(plotLeft, plotTop, plotLeft, plotBottom)
    fillGrad.addColorStop(0,   `rgba(${bbR},${bbG},${bbB},0.35)`)
    fillGrad.addColorStop(0.6, `rgba(${bbR},${bbG},${bbB},0.12)`)
    fillGrad.addColorStop(1,   `rgba(${bbR},${bbG},${bbB},0.02)`)
    ctx.fillStyle = fillGrad
    ctx.fill()
    ctx.restore()

    // Stroke the curve on top
    ctx.strokeStyle = `rgba(${bbR},${bbG},${bbB},0.9)`
    ctx.lineWidth   = 2
    ctx.setLineDash([])
    ctx.beginPath()
    for (let i = 0; i < N_LAMBDA; i++) {
      const x = mapX(i)
      const y = mapY(state.curve[i])
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // ── Wien peak line ──────────────────────────────────────────────────────
    const peakNm = state.peakLambda
    if (peakNm >= LAMBDA_MIN_NM && peakNm <= LAMBDA_MAX_NM) {
      const peakX = plotLeft + ((peakNm - LAMBDA_MIN_NM) / (LAMBDA_MAX_NM - LAMBDA_MIN_NM)) * plotW

      ctx.strokeStyle = 'rgba(255,255,255,0.45)'
      ctx.lineWidth   = 1
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(peakX, plotTop)
      ctx.lineTo(peakX, plotBottom)
      ctx.stroke()
      ctx.setLineDash([])

      // Label
      const peakFsz = Math.max(9, Math.round(W * 0.012))
      ctx.font      = `${peakFsz}px monospace`
      ctx.fillStyle = 'rgba(255,255,255,0.65)'
      ctx.textAlign = 'center'
      ctx.fillText(`\u03BB_max = ${Math.round(peakNm)} nm`, peakX, plotTop - 6)
    }

    // ── Axes ────────────────────────────────────────────────────────────────
    ctx.strokeStyle = 'rgba(240,237,232,0.25)'
    ctx.lineWidth   = 1
    ctx.setLineDash([])
    // x axis
    ctx.beginPath()
    ctx.moveTo(plotLeft, plotBottom)
    ctx.lineTo(plotRight, plotBottom)
    ctx.stroke()
    // y axis
    ctx.beginPath()
    ctx.moveTo(plotLeft, plotTop)
    ctx.lineTo(plotLeft, plotBottom)
    ctx.stroke()

    // ── Axis labels ─────────────────────────────────────────────────────────
    const axFsz = Math.max(9, Math.round(W * 0.011))
    ctx.font      = `${axFsz}px monospace`
    ctx.fillStyle = 'rgba(240,237,232,0.40)'

    // X axis tick marks
    const xTicks = [200, 500, 1000, 1500, 2000, 2500]
    ctx.textAlign = 'center'
    for (const nm of xTicks) {
      if (nm < LAMBDA_MIN_NM || nm > LAMBDA_MAX_NM) continue
      const tx = plotLeft + ((nm - LAMBDA_MIN_NM) / (LAMBDA_MAX_NM - LAMBDA_MIN_NM)) * plotW
      ctx.fillText(`${nm}`, tx, plotBottom + bandH + axFsz + 6)
      // Tick mark
      ctx.beginPath()
      ctx.moveTo(tx, plotBottom)
      ctx.lineTo(tx, plotBottom + 4)
      ctx.stroke()
    }

    // X axis label
    ctx.fillStyle = 'rgba(240,237,232,0.30)'
    ctx.fillText('\u03BB (nm)', plotLeft + plotW * 0.5, plotBottom + bandH + axFsz * 2 + 12)

    // Y axis label
    ctx.save()
    ctx.translate(plotLeft - axFsz * 3, plotTop + plotH * 0.5)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(240,237,232,0.30)'
    ctx.fillText(logScale ? 'log B(\u03BB, T)' : 'B(\u03BB, T)', 0, 0)
    ctx.restore()

    // Y axis tick marks (for log scale show decades)
    if (logScale) {
      ctx.fillStyle = 'rgba(240,237,232,0.25)'
      ctx.textAlign = 'right'
      for (let decade = 0; decade >= -8; decade -= 2) {
        const y = plotBottom + (decade / -8) * (-plotH)
        ctx.fillText(`10^${decade}`, plotLeft - 6, y + axFsz * 0.35)
        // Grid line
        ctx.strokeStyle = 'rgba(240,237,232,0.08)'
        ctx.beginPath()
        ctx.moveTo(plotLeft, y)
        ctx.lineTo(plotRight, y)
        ctx.stroke()
      }
    } else {
      // Linear scale — just show 0 at bottom and max at top
      ctx.textAlign = 'right'
      ctx.fillStyle = 'rgba(240,237,232,0.25)'
      ctx.fillText('0', plotLeft - 6, plotBottom + axFsz * 0.35)
    }

    // ── Info text ───────────────────────────────────────────────────────────
    const infoFsz = Math.max(9, Math.round(W * 0.011))
    ctx.font      = `${infoFsz}px monospace`
    ctx.fillStyle = 'rgba(240,237,232,0.35)'
    ctx.textAlign = 'left'

    const wienStr  = `Wien peak: ${Math.round(peakNm)} nm`
    const sbPower  = (5.670374419e-8 * T ** 4).toExponential(2)
    const sbStr    = `Stefan-Boltzmann: ${sbPower} W/m\u00B2`
    ctx.fillText(wienStr, 12, infoFsz + 8)
    ctx.fillText(sbStr,   12, infoFsz * 2 + 14)

    // Reset text alignment
    ctx.textAlign = 'left'
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'slider',
        id:      'temperature',
        label:   '\u6E29\u5EA6 (K)',
        labelEn: 'Temperature (K)',
        min:     500,
        max:     30000,
        step:    100,
        default: 5500,
      },
      {
        type:    'toggle',
        id:      'showReference',
        label:   '\u53C2\u8003\u66F2\u7EBF',
        labelEn: 'Reference curves',
        default: true,
      },
      {
        type:    'toggle',
        id:      'logScale',
        label:   '\u5BF9\u6570\u7EB5\u8F74',
        labelEn: 'Log scale',
        default: false,
      },
    ]
  },

  destroy() {},
}

export default BlackbodyRadiation

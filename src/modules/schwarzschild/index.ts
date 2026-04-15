// Schwarzschild Black Hole — Photon geodesics in Schwarzschild spacetime
// Spacetime geometry of a Schwarzschild black hole. Photon deflection, the
// photon sphere, event horizon, and ISCO shown through ray tracing.
//
// Physics (G=c=1, mass M=1  →  Rs = 2, r_photon = 3, r_ISCO = 6):
//   Orbit equation in terms of u = 1/r:
//     d²u/dφ² = -u + 3u²
//   Critical impact parameter: b_crit = 3√3 ≈ 5.196

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Types ─────────────────────────────────────────────────────────────────────

type Vec2 = { x: number; y: number }

type Ray = {
  pts:      Vec2[]
  captured: boolean
  b:        number   // impact parameter
}

type SchwarzschildState = {
  rays:     Ray[]
  angle:    number   // slow auto-rotation (radians)
  /** track param changes to know when to recompute */
  _lastNumRays: number
}

// ── Ray tracing ───────────────────────────────────────────────────────────────

const R_START = 40   // integrate from r = 40M
const D_PHI   = 0.01 // angular step (radians)
const MAX_STEPS = 5000

/**
 * Trace a single photon with impact parameter b.
 * Uses the Schwarzschild orbit equation:  u'' = -u + 3u²  (M=1)
 * Integrate from r_start inward.
 */
function traceRay(b: number): Ray {
  const pts: Vec2[] = []

  // Initial conditions: start at r=R_START heading inward
  // u = 1/r,  u' = du/dφ
  // For a ray coming from large r with impact parameter b:
  //   at φ=0, x = -R_START, y = b  (i.e. r = R_START, φ_polar = π - atan2(b, R_START))
  // We'll integrate φ from 0 to ~2π and track (r,φ) → (x,y)

  // Initial u and u' from geometry at r = R_START
  // The initial angle: ray comes from -x direction at height y=b
  // φ_0 = π - arcsin(b/R_START) (approximately π for large R_START)
  const phi0 = Math.PI - Math.asin(Math.min(1, b / R_START))
  const u0   = 1 / R_START

  // du/dφ: negative (r is decreasing) = coming inward
  // From conservation: (du/dφ)² = 1/b² - u²(1 - 2u)
  const discrim = 1 / (b * b) - u0 * u0 * (1 - 2 * u0)
  const du0  = discrim > 0 ? -Math.sqrt(discrim) : 0   // negative = inward

  let u_prev = u0 - du0 * D_PHI  // backward Euler seed
  let u_cur  = u0
  let phi    = phi0

  let captured = false

  for (let step = 0; step < MAX_STEPS; step++) {
    // Record point
    const r = 1 / Math.max(u_cur, 1e-9)
    const x = r * Math.cos(phi)
    const y = r * Math.sin(phi)
    pts.push({ x, y })

    // Check termination
    if (u_cur > 0.48) {
      // Crossed event horizon (r < ~2.08, well inside Rs=2)
      captured = true
      break
    }
    if (r > R_START * 1.5) {
      // Escaped to large r
      break
    }

    // Leapfrog step: u_{n+1} = 2*u_n - u_{n-1} + dφ² * (-u_n + 3*u_n²)
    const accel   = -u_cur + 3 * u_cur * u_cur
    const u_next  = 2 * u_cur - u_prev + D_PHI * D_PHI * accel

    u_prev = u_cur
    u_cur  = u_next
    phi   += D_PHI
  }

  return { pts, captured, b }
}

/**
 * Compute all ray paths for the given number of rays.
 * Impact parameters spaced from b_min=2.5 to b_max=20 (M=1).
 */
function computeRays(numRays: number): Ray[] {
  const rays: Ray[] = []
  const b_min = 2.5
  const b_max = 20
  for (let i = 0; i < numRays; i++) {
    const b = b_min + (b_max - b_min) * (i / (numRays - 1))
    rays.push(traceRay(b))
  }
  return rays
}

// ── Module ────────────────────────────────────────────────────────────────────

const B_CRIT = 3 * Math.sqrt(3)  // ≈ 5.196 — critical impact parameter

const Schwarzschild: PhysicsModule<SchwarzschildState> = {
  id: 'schwarzschild',

  metadata: {
    title:        '史瓦西黑洞',
    titleEn:      'Schwarzschild Black Hole',
    description:  '广义相对论预言的黑洞时空结构。光子在强引力场中偏折，光子球、事件视界与ISCO清晰可见。',
    descriptionEn: 'Spacetime geometry of a Schwarzschild black hole. Photon deflection, the photon sphere, event horizon, and ISCO shown through ray tracing.',
    theory:       ['general-relativity'],
    mathLevel:    2,
    renderer:     'canvas2d',
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────────

  init(_canvas, params): SchwarzschildState {
    const numRays = params.numRays as number
    const rays    = computeRays(numRays)
    return {
      rays,
      angle:        0,
      _lastNumRays: numRays,
    }
  },

  tick(state, dt, params): SchwarzschildState {
    const numRays = params.numRays as number
    const rotate  = params.rotate  as boolean

    // Recompute rays when numRays changes
    if (numRays !== state._lastNumRays) {
      return {
        rays:         computeRays(numRays),
        angle:        state.angle,
        _lastNumRays: numRays,
      }
    }

    const angle = rotate
      ? state.angle + dt * 0.15
      : state.angle

    return { ...state, angle }
  },

  render(state, canvas, params) {
    const el         = canvas as HTMLCanvasElement
    const ctx        = el.getContext('2d')
    if (!ctx) return

    const W          = el.width
    const H          = el.height
    const showISCO   = params.showISCO   as boolean
    const showLabels = params.showLabels as boolean

    // Background
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, W, H)

    const cx    = W / 2
    const cy    = H / 2
    const scale = Math.min(W, H) / 28   // 1M = this many px

    // Rotate entire scene
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(state.angle)

    // ── 1. Accretion disk glow ─────────────────────────────────────────────────
    // Two semi-transparent ellipses simulating a foreshortened disk
    // Draw only bottom half (lower semicircle) for 3D illusion
    const diskR1 = 6 * scale          // r_ISCO
    const diskR2 = 6 * 1.4 * scale
    const diskRy = scale * 1.5        // foreshortening: flat ellipse

    for (let pass = 0; pass < 2; pass++) {
      const diskR = pass === 0 ? diskR2 : diskR1
      const grad  = ctx.createRadialGradient(0, diskRy * 0.4, diskR * 0.3, 0, 0, diskR)
      grad.addColorStop(0,   pass === 0 ? 'rgba(200,120,40,0.08)' : 'rgba(200,149,90,0.14)')
      grad.addColorStop(0.6, pass === 0 ? 'rgba(200,120,40,0.05)' : 'rgba(200,149,90,0.07)')
      grad.addColorStop(1,   'rgba(0,0,0,0)')

      ctx.save()
      ctx.scale(1, diskRy / diskR)
      ctx.beginPath()
      // Lower half arc only (0 → π, i.e. bottom semicircle in canvas coords)
      ctx.arc(0, 0, diskR, 0, Math.PI)
      ctx.fillStyle = grad
      ctx.fill()
      ctx.restore()
    }

    // ── 2. Ray paths ──────────────────────────────────────────────────────────
    for (const ray of state.rays) {
      if (ray.pts.length < 2) continue

      const nearPhotonSphere = Math.abs(ray.b - B_CRIT) < 0.5
      const tB = Math.max(0, Math.min(1, (ray.b - 2.5) / (20 - 2.5)))

      let strokeStyle: string
      if (nearPhotonSphere) {
        strokeStyle = 'rgba(255,255,255,0.9)'
      } else if (ray.captured) {
        // Copper → deep red
        const rr  = Math.round(200 * (1 - tB) + 60 * tB)
        const gg  = Math.round(80  * (1 - tB) + 0  * tB)
        const bb  = Math.round(30  * (1 - tB) + 0  * tB)
        strokeStyle = `rgba(${rr},${gg},${bb},0.7)`
      } else {
        // Blue (large b) → copper (small b near critical)
        const rr  = Math.round(96  + (200 - 96)  * (1 - tB))
        const gg  = Math.round(165 + (149 - 165) * (1 - tB))
        const bb  = Math.round(250 + (90  - 250) * (1 - tB))
        strokeStyle = `rgba(${rr},${gg},${bb},0.6)`
      }

      ctx.beginPath()
      for (let i = 0; i < ray.pts.length; i++) {
        const px = ray.pts[i].x * scale
        const py = ray.pts[i].y * scale
        if (i === 0) ctx.moveTo(px, py)
        else         ctx.lineTo(px, py)
      }
      ctx.strokeStyle = strokeStyle
      ctx.lineWidth   = nearPhotonSphere ? 1.4 : 0.9
      ctx.stroke()
    }

    // ── 3. Photon sphere r = 3M ───────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(0, 0, 3 * scale, 0, Math.PI * 2)
    ctx.setLineDash([5, 7])
    ctx.strokeStyle = 'rgba(240,237,232,0.18)'
    ctx.lineWidth   = 0.8
    ctx.stroke()
    ctx.setLineDash([])

    // ── 4. ISCO r = 6M ────────────────────────────────────────────────────────
    if (showISCO) {
      ctx.beginPath()
      ctx.arc(0, 0, 6 * scale, 0, Math.PI * 2)
      ctx.setLineDash([6, 9])
      ctx.strokeStyle = 'rgba(200,149,90,0.14)'
      ctx.lineWidth   = 0.7
      ctx.stroke()
      ctx.setLineDash([])
    }

    // ── 5. Event horizon r = 2M (solid black + copper glow) ──────────────────
    // Outer glow ring
    const ehGrad = ctx.createRadialGradient(0, 0, 1.6 * scale, 0, 0, 2.6 * scale)
    ehGrad.addColorStop(0,   'rgba(200,149,90,0.22)')
    ehGrad.addColorStop(0.6, 'rgba(200,149,90,0.06)')
    ehGrad.addColorStop(1,   'rgba(0,0,0,0)')
    ctx.beginPath()
    ctx.arc(0, 0, 2.6 * scale, 0, Math.PI * 2)
    ctx.fillStyle = ehGrad
    ctx.fill()

    // Solid black disk
    ctx.beginPath()
    ctx.arc(0, 0, 2 * scale, 0, Math.PI * 2)
    ctx.fillStyle = '#000000'
    ctx.fill()

    // ── 6. Labels ─────────────────────────────────────────────────────────────
    if (showLabels) {
      ctx.restore()   // undo rotation so labels stay upright
      ctx.save()
      ctx.font      = '10px monospace'
      ctx.fillStyle = 'rgba(240,237,232,0.50)'

      const labelX = cx + 2.1 * scale + 5
      const labelY = cy

      // Rs label at event horizon
      ctx.fillStyle = 'rgba(200,149,90,0.65)'
      ctx.fillText('Rs = 2M', cx + 2.15 * scale, cy - 6)

      // Photon sphere label
      ctx.fillStyle = 'rgba(240,237,232,0.45)'
      ctx.fillText('photon sphere r = 3M', cx + 3.1 * scale, cy - 4 - 14)

      // ISCO label (only if shown)
      if (showISCO) {
        ctx.fillStyle = 'rgba(200,149,90,0.40)'
        ctx.fillText('ISCO r = 6M', cx + 6.15 * scale, cy - 4 - 28)
      }

      void labelX; void labelY  // suppress unused-var warnings
    } else {
      ctx.restore()
      ctx.save()
    }

    ctx.restore()
  },

  // ── Controls ──────────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'slider',
        id:      'numRays',
        label:   '光线数量',
        labelEn: 'Ray count',
        min:     8,
        max:     40,
        step:    2,
        default: 20,
      },
      {
        type:    'toggle',
        id:      'showISCO',
        label:   '显示ISCO',
        labelEn: 'Show ISCO',
        default: true,
      },
      {
        type:    'toggle',
        id:      'showLabels',
        label:   '显示标签',
        labelEn: 'Show labels',
        default: true,
      },
      {
        type:    'toggle',
        id:      'rotate',
        label:   '自动旋转',
        labelEn: 'Auto-rotate',
        default: false,
      },
    ]
  },

  destroy() {},
}

export default Schwarzschild

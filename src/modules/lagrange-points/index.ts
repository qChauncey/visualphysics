// ─────────────────────────────────────────────
//  Module: Lagrange Points
//  Renderer: Canvas 2D
//  Physics: Circular Restricted Three-Body Problem (CR3BP)
//  Frame:  Co-rotating (bodies fixed, Coriolis + centrifugal forces active)
//  Units:  G(m1+m2)=1, semi-major axis a=1, Ω=1
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Types ─────────────────────────────────────

type Particle = {
  x: number; y: number
  vx: number; vy: number
  trail: [number, number][]
  color: string
  label: string
}

type LagrangeState = {
  mu: number
  // Lagrange point positions
  L: [number, number][]   // [L1..L5]
  particles: Particle[]
  heatmap: ImageData | null
  heatCanvasW: number
  heatCanvasH: number
  time: number
  canvasW: number
  canvasH: number
  lastMu: number
}

// ── CR3BP helpers ──────────────────────────────

/** Effective potential Φ_eff = -(1-μ)/r1 - μ/r2 - (x²+y²)/2 */
function phi(x: number, y: number, mu: number): number {
  const m1 = 1 - mu
  const r1 = Math.sqrt((x + mu) ** 2 + y * y)
  const r2 = Math.sqrt((x - 1 + mu) ** 2 + y * y)
  if (r1 < 1e-6 || r2 < 1e-6) return -1e6
  return -m1 / r1 - mu / r2 - (x * x + y * y) / 2
}

/** Gradient of Φ_eff */
function gradPhi(x: number, y: number, mu: number): [number, number] {
  const m1 = 1 - mu
  const r1 = Math.sqrt((x + mu) ** 2 + y * y)
  const r2 = Math.sqrt((x - 1 + mu) ** 2 + y * y)
  if (r1 < 1e-6 || r2 < 1e-6) return [0, 0]
  const r13 = r1 ** 3; const r23 = r2 ** 3
  const gx = m1 * (x + mu) / r13 + mu * (x - 1 + mu) / r23 - x
  const gy = m1 * y / r13        + mu * y / r23             - y
  return [gx, gy]
}

/** One RK4 step for CR3BP: state = [x, y, vx, vy] */
function rk4Step(
  x: number, y: number, vx: number, vy: number,
  mu: number, h: number
): [number, number, number, number] {
  function deriv(sx: number, sy: number, svx: number, svy: number) {
    const [gx, gy] = gradPhi(sx, sy, mu)
    return [svx, svy, 2 * svy - gx, -2 * svx - gy]
  }
  const [k1x, k1y, k1vx, k1vy] = deriv(x, y, vx, vy)
  const [k2x, k2y, k2vx, k2vy] = deriv(x + h/2*k1x, y + h/2*k1y, vx + h/2*k1vx, vy + h/2*k1vy)
  const [k3x, k3y, k3vx, k3vy] = deriv(x + h/2*k2x, y + h/2*k2y, vx + h/2*k2vx, vy + h/2*k2vy)
  const [k4x, k4y, k4vx, k4vy] = deriv(x + h*k3x, y + h*k3y, vx + h*k3vx, vy + h*k3vy)
  return [
    x  + h/6*(k1x  + 2*k2x  + 2*k3x  + k4x),
    y  + h/6*(k1y  + 2*k2y  + 2*k3y  + k4y),
    vx + h/6*(k1vx + 2*k2vx + 2*k3vx + k4vx),
    vy + h/6*(k1vy + 2*k2vy + 2*k3vy + k4vy),
  ]
}

/** Newton's method to find L-point on x-axis */
function findCollinear(x0: number, mu: number, maxIter = 60): number {
  let x = x0
  for (let i = 0; i < maxIter; i++) {
    const [g] = gradPhi(x, 0, mu)
    const h = 1e-5
    const [g2] = gradPhi(x + h, 0, mu)
    const dg = (g2 - g) / h
    if (Math.abs(dg) < 1e-14) break
    const dx = -g / dg
    x += Math.max(-0.1, Math.min(0.1, dx))
    if (Math.abs(dx) < 1e-10) break
  }
  return x
}

function findLagrangePoints(mu: number): [number, number][] {
  const rH = (mu / 3) ** (1 / 3)
  const xL1 = findCollinear(1 - mu - rH * 0.95, mu)
  const xL2 = findCollinear(1 - mu + rH * 0.95, mu)
  const xL3 = findCollinear(-1 - 5 * mu / 12, mu)
  const xL4 = 0.5 - mu;  const yL4 =  Math.sqrt(3) / 2
  const xL5 = 0.5 - mu;  const yL5 = -Math.sqrt(3) / 2
  return [[xL1, 0], [xL2, 0], [xL3, 0], [xL4, yL4], [xL5, yL5]]
}

// ── Heatmap ────────────────────────────────────

const HM = 300   // heatmap resolution

function buildHeatmap(mu: number, W: number, H: number): ImageData {
  const VIEW_X = 2.5  // world units left/right
  const VIEW_Y = VIEW_X * (H / W)
  const data = new Uint8ClampedArray(HM * HM * 4)

  // First pass: collect values and find range
  const vals = new Float64Array(HM * HM)
  for (let row = 0; row < HM; row++) {
    for (let col = 0; col < HM; col++) {
      const wx = (col / (HM - 1) - 0.5) * 2 * VIEW_X
      const wy = (0.5 - row / (HM - 1)) * 2 * VIEW_Y
      vals[row * HM + col] = phi(wx, wy, mu)
    }
  }

  // Clip near singularities, find max
  const CLIP_LO = -12.0
  let phiMax = -Infinity
  for (let i = 0; i < vals.length; i++) {
    if (vals[i] > CLIP_LO && vals[i] > phiMax) phiMax = vals[i]
  }
  const phiRange = phiMax - CLIP_LO

  // Second pass: colour map
  for (let i = 0; i < vals.length; i++) {
    const v  = vals[i]
    const t  = v < CLIP_LO ? 0 : Math.min((v - CLIP_LO) / phiRange, 1)

    // Color ramp: near-black → deep blue → blue → blue-gray → copper
    let r, g, b
    if (t < 0.45) {
      const s = t / 0.45
      r =  3 + s * 10; g =  3 + s * 20; b = 12 + s * 55
    } else if (t < 0.72) {
      const s = (t - 0.45) / 0.27
      r = 13 + s * 40; g = 23 + s * 60; b = 67 + s * 60
    } else if (t < 0.90) {
      const s = (t - 0.72) / 0.18
      r = 53 + s * 80; g = 83 + s * 50; b = 127 - s * 30
    } else {
      const s = (t - 0.90) / 0.10
      r = 133 + s * 67; g = 133 + s * 16; b = 97 - s * 7
    }

    data[i * 4 + 0] = Math.round(r)
    data[i * 4 + 1] = Math.round(g)
    data[i * 4 + 2] = Math.round(b)
    data[i * 4 + 3] = 255
  }

  // Create ImageData at heatmap resolution (will be drawImage-scaled to canvas)
  return new ImageData(data, HM, HM)
}

// ── Particle initialisation ────────────────────

const TRAIL_MAX = 600
const PARTICLE_DT = 0.003
const SUBSTEPS    = 20

function makeParticles(L: [number, number][], mu: number): Particle[] {
  const eps = 0.04   // perturbation from exact L-point
  const isStable = mu < 0.03852  // L4/L5 stability threshold

  // Colors: unstable L-points → red/orange; stable → teal/green
  const unstableColor = 'rgba(255, 100, 60, 0.90)'
  const stableColor   = isStable ? 'rgba(52, 211, 153, 0.90)' : 'rgba(255, 180, 60, 0.90)'

  return [
    { x: L[0][0] + eps, y: eps * 0.5, vx: 0, vy: 0.01, trail: [], color: unstableColor, label: 'L1' },
    { x: L[1][0] + eps, y: eps * 0.5, vx: 0, vy: 0.01, trail: [], color: unstableColor, label: 'L2' },
    { x: L[2][0] - eps, y: eps * 0.5, vx: 0, vy: -0.01, trail: [], color: unstableColor, label: 'L3' },
    { x: L[3][0] + eps, y: L[3][1] + eps, vx: 0, vy: 0, trail: [], color: stableColor, label: 'L4' },
    { x: L[4][0] + eps, y: L[4][1] - eps, vx: 0, vy: 0, trail: [], color: stableColor, label: 'L5' },
  ]
}

function makeState(mu: number, W: number, H: number): LagrangeState {
  const L = findLagrangePoints(mu)
  const particles = makeParticles(L, mu)
  const heatmap = buildHeatmap(mu, W, H)
  return {
    mu, L, particles, heatmap,
    heatCanvasW: W, heatCanvasH: H,
    time: 0, canvasW: W, canvasH: H, lastMu: mu,
  }
}

// ── World ↔ Canvas coordinate conversion ──────

const VIEW_X = 2.5

function worldToCanvas(wx: number, wy: number, W: number, H: number): [number, number] {
  const scale = W / (2 * VIEW_X)
  const cx = W / 2 + wx * scale
  const cy = H / 2 - wy * scale
  return [cx, cy]
}

// ── Module ────────────────────────────────────

const LagrangePointsModule: PhysicsModule<LagrangeState> = {
  id: 'lagrange-points',

  metadata: {
    title:       '拉格朗日点',
    titleEn:     'Lagrange Points',
    description:
      '圆形限制性三体问题中的五个平衡点。在共旋转参考系中，质点在有效势场与科里奥利力作用下运动。L4/L5 在质量比小于0.0385时稳定，是特洛伊小行星的栖身之所。',
    descriptionEn:
      'Five equilibrium points of the Circular Restricted Three-Body Problem. ' +
      'The effective potential combines gravity and centrifugal terms, creating a rich landscape. ' +
      'L4 and L5 are stable for mass ratios μ < 0.0385 — they host the Trojan asteroids.',
    theory:    ['classical-mechanics'],
    mathLevel: 2,
    renderer:  'canvas2d',
    linkedModules: ['three-body', 'spacetime-curvature'],
  },

  init(canvas, params): LagrangeState {
    const el = canvas as HTMLCanvasElement
    const W  = el.clientWidth  || 800
    const H  = el.clientHeight || 600
    const mu = Number(params.massRatio ?? 0.15)
    return makeState(mu, W, H)
  },

  tick(state, _dt, params): LagrangeState {
    const mu    = Number(params.massRatio ?? 0.15)
    const paused = params.paused === true

    // Rebuild if mu changed
    if (mu !== state.lastMu) {
      return makeState(mu, state.canvasW, state.canvasH)
    }

    if (params.reset === true) {
      return makeState(mu, state.canvasW, state.canvasH)
    }

    if (paused) return state

    // Integrate all particles
    for (const p of state.particles) {
      for (let s = 0; s < SUBSTEPS; s++) {
        ;[p.x, p.y, p.vx, p.vy] = rk4Step(p.x, p.y, p.vx, p.vy, mu, PARTICLE_DT)
      }
      // Record trail
      p.trail.push([p.x, p.y])
      if (p.trail.length > TRAIL_MAX) p.trail.shift()

      // Remove escaped particles (far from system)
      if (Math.abs(p.x) > 6 || Math.abs(p.y) > 6) {
        p.trail = []
        // Reset near original L-point
        const idx = state.L.findIndex(([lx, ly]) =>
          p.label === `L${state.L.indexOf([lx, ly]) + 1}`
        )
        if (idx >= 0) {
          p.x = state.L[idx][0]; p.y = state.L[idx][1]
          p.vx = 0; p.vy = 0
        }
      }
    }

    state.time += PARTICLE_DT * SUBSTEPS
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

    const { mu, L, particles, heatmap } = state
    const showHeat = params.showHeatmap !== false
    const showPart = params.showParticles !== false

    // Background
    ctx.fillStyle = '#04040c'
    ctx.fillRect(0, 0, W, H)

    // ── Potential heatmap ──────────────────────
    if (showHeat && heatmap) {
      // Rebuild heatmap if canvas size changed significantly
      if (Math.abs(state.heatCanvasW - W) > 80 || Math.abs(state.heatCanvasH - H) > 80) {
        const newHM = buildHeatmap(mu, W, H)
        state.heatmap = newHM
        state.heatCanvasW = W
        state.heatCanvasH = H
      }
      const offscreen = new OffscreenCanvas(HM, HM)
      const offCtx = offscreen.getContext('2d')
      if (offCtx) {
        offCtx.putImageData(state.heatmap!, 0, 0)
        ctx.drawImage(offscreen, 0, 0, W, H)
      }
    }

    // ── Grid lines ─────────────────────────────
    const scale = W / (2 * VIEW_X)
    ctx.strokeStyle = 'rgba(240,237,232,0.06)'
    ctx.lineWidth = 1
    for (let gx = -2; gx <= 2; gx++) {
      const cx = W / 2 + gx * scale
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke()
    }
    for (let gy = -2; gy <= 2; gy++) {
      const cy = H / 2 - gy * scale
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke()
    }

    // ── Roche lobes outline (Hill sphere indicators) ──
    ctx.strokeStyle = 'rgba(240,237,232,0.08)'
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 8])
    const rH = (mu / 3) ** (1 / 3)
    const [lx1, ly1] = worldToCanvas(1 - mu, 0, W, H)
    ctx.beginPath()
    ctx.arc(lx1, ly1, rH * scale, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])

    // ── Particle trails ────────────────────────
    if (showPart) {
      for (const p of particles) {
        if (p.trail.length < 2) continue
        ctx.lineWidth = 1.2
        ctx.lineCap   = 'round'
        for (let i = 1; i < p.trail.length; i++) {
          const alpha = (i / p.trail.length) * 0.7
          ctx.strokeStyle = p.color.replace('0.90', alpha.toFixed(2))
          const [x0, y0] = worldToCanvas(p.trail[i - 1][0], p.trail[i - 1][1], W, H)
          const [x1, y1] = worldToCanvas(p.trail[i][0],     p.trail[i][1],     W, H)
          ctx.beginPath()
          ctx.moveTo(x0, y0); ctx.lineTo(x1, y1)
          ctx.stroke()
        }
      }
    }

    // ── Lagrange points ────────────────────────
    const Lnames   = ['L1', 'L2', 'L3', 'L4', 'L5']
    const isStable = mu < 0.03852
    for (let i = 0; i < 5; i++) {
      const [wx, wy] = L[i]
      const [cx, cy] = worldToCanvas(wx, wy, W, H)
      const stable   = i >= 3 && isStable
      const col      = stable ? '#34d399' : '#f87171'

      // Outer ring
      ctx.beginPath()
      ctx.arc(cx, cy, 10, 0, Math.PI * 2)
      ctx.strokeStyle = col + 'aa'
      ctx.lineWidth   = 1.5
      ctx.stroke()

      // Center dot
      ctx.beginPath()
      ctx.arc(cx, cy, 3, 0, Math.PI * 2)
      ctx.fillStyle = col
      ctx.fill()

      // Label
      ctx.font      = '11px monospace'
      ctx.fillStyle = col + 'cc'
      ctx.textAlign = 'center'
      const labelOffY = (wy >= 0 || i === 2) ? -16 : 22
      ctx.fillText(Lnames[i], cx, cy + labelOffY)
    }

    // ── Massive bodies ─────────────────────────
    // m1 (large, at (-mu, 0))
    const [bx1, by1] = worldToCanvas(-mu, 0, W, H)
    const r1px = Math.max(8, (1 - mu) ** (1/3) * 22)
    const g1   = ctx.createRadialGradient(bx1 - r1px*0.3, by1 - r1px*0.3, 1, bx1, by1, r1px)
    g1.addColorStop(0, '#fff9e0'); g1.addColorStop(1, '#f0c040')
    ctx.beginPath(); ctx.arc(bx1, by1, r1px, 0, Math.PI * 2)
    ctx.fillStyle = g1; ctx.fill()
    // Glow
    const glow1 = ctx.createRadialGradient(bx1, by1, r1px * 0.5, bx1, by1, r1px * 3)
    glow1.addColorStop(0, 'rgba(240,192,64,0.25)'); glow1.addColorStop(1, 'rgba(240,192,64,0)')
    ctx.beginPath(); ctx.arc(bx1, by1, r1px * 3, 0, Math.PI * 2)
    ctx.fillStyle = glow1; ctx.fill()

    // m2 (small, at (1-mu, 0))
    const [bx2, by2] = worldToCanvas(1 - mu, 0, W, H)
    const r2px = Math.max(4, mu ** (1/3) * 22)
    const g2   = ctx.createRadialGradient(bx2 - r2px*0.3, by2 - r2px*0.3, 1, bx2, by2, r2px)
    g2.addColorStop(0, '#c0e0ff'); g2.addColorStop(1, '#4080c0')
    ctx.beginPath(); ctx.arc(bx2, by2, r2px, 0, Math.PI * 2)
    ctx.fillStyle = g2; ctx.fill()

    // ── Particles ──────────────────────────────
    if (showPart) {
      for (const p of particles) {
        const [px, py] = worldToCanvas(p.x, p.y, W, H)
        ctx.beginPath()
        ctx.arc(px, py, 4, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
      }
    }

    // ── HUD ────────────────────────────────────
    ctx.font      = '11px monospace'
    ctx.textAlign = 'left'
    ctx.fillStyle = 'rgba(240,237,232,0.30)'
    ctx.fillText(`μ = ${mu.toFixed(3)}  (m₂/M)`, 14, 20)
    ctx.fillText(`t = ${state.time.toFixed(1)} T`, 14, 36)

    // Stability indicator
    const stabText = isStable ? 'L4/L5 stable (Trojan)' : 'L4/L5 unstable (μ > 0.0385)'
    ctx.fillStyle  = isStable ? 'rgba(52,211,153,0.55)' : 'rgba(248,113,113,0.55)'
    ctx.fillText(stabText, 14, 52)

    // Body labels
    ctx.textAlign = 'center'
    ctx.fillStyle = 'rgba(240,192,64,0.55)'
    ctx.fillText('m₁', bx1, by1 + r1px + 14)
    ctx.fillStyle = 'rgba(128,192,255,0.55)'
    ctx.fillText('m₂', bx2, by2 + r2px + 14)
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'massRatio',
        label: '质量比 μ',
        labelEn: 'Mass Ratio μ',
        min: 0.001, max: 0.499, step: 0.001, default: 0.15,
      },
      {
        type: 'toggle',
        id: 'showHeatmap',
        label: '显示有效势场',
        labelEn: 'Show Effective Potential',
        default: true,
      },
      {
        type: 'toggle',
        id: 'showParticles',
        label: '显示测试粒子',
        labelEn: 'Show Test Particles',
        default: true,
      },
      {
        type: 'button',
        id: 'reset',
        label: '重置粒子',
        labelEn: 'Reset Particles',
      },
    ]
  },

  destroy(_canvas): void {
    // nothing to clean up
  },
}

export default LagrangePointsModule

// ─────────────────────────────────────────────
//  Module: Brownian Motion
//  Renderer: Canvas 2D
//  Physics: Elastic collisions between gas molecules and a heavy tracer particle
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Types ────────────────────────────────────

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  speed0: number  // initial speed (for colouring)
}

type TrailPoint = { x: number; y: number }

type BrownianState = {
  gas: Particle[]
  tracer: Particle
  trail: TrailPoint[]
  width: number
  height: number
  time: number
  resetFlag: boolean
}

// ── Constants ────────────────────────────────

const GAS_COUNT   = 480
const GAS_R       = 3.5      // gas particle radius (px)
const TRACER_R    = 18       // tracer (pollen) radius (px)
const TRACER_MASS = (TRACER_R / GAS_R) ** 2   // mass proportional to area
const GAS_MASS    = 1

// ── Helpers ──────────────────────────────────

/** Maxwell–Boltzmann-like speed for temperature T (mean = sqrt(2T)) */
function mbSpeed(T: number): number {
  // Box-Muller → Rayleigh distribution for 2D speed
  const u = Math.random()
  const v = Math.random()
  const stddev = Math.sqrt(T)
  const vx = stddev * Math.sqrt(-2 * Math.log(Math.max(u, 1e-10))) * Math.cos(2 * Math.PI * v)
  const vy = stddev * Math.sqrt(-2 * Math.log(Math.max(v, 1e-10))) * Math.sin(2 * Math.PI * u)
  return Math.sqrt(vx * vx + vy * vy)
}

function randomVelocity(T: number): { vx: number; vy: number } {
  const angle = Math.random() * 2 * Math.PI
  const speed = mbSpeed(T)
  return { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
}

function initState(canvas: HTMLElement, T: number): BrownianState {
  const el = canvas as HTMLCanvasElement
  const W = el.width  || el.clientWidth  || 800
  const H = el.height || el.clientHeight || 600

  const gas: Particle[] = []
  for (let i = 0; i < GAS_COUNT; i++) {
    const { vx, vy } = randomVelocity(T)
    const speed = Math.sqrt(vx * vx + vy * vy)
    gas.push({
      x:  GAS_R + Math.random() * (W - 2 * GAS_R),
      y:  GAS_R + Math.random() * (H - 2 * GAS_R),
      vx, vy,
      r:  GAS_R,
      speed0: speed,
    })
  }

  const tracerVel = randomVelocity(T * 0.05)
  const tracer: Particle = {
    x:  W / 2,
    y:  H / 2,
    vx: tracerVel.vx,
    vy: tracerVel.vy,
    r:  TRACER_R,
    speed0: 0,
  }

  return { gas, tracer, trail: [{ x: tracer.x, y: tracer.y }], width: W, height: H, time: 0, resetFlag: false }
}

/** Elastic collision between two circles (2D, off-axis) */
function elasticCollide(
  p1: Particle, m1: number,
  p2: Particle, m2: number
) {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist === 0) return

  // Normal unit vector
  const nx = dx / dist
  const ny = dy / dist

  // Relative velocity along normal
  const dvx = p1.vx - p2.vx
  const dvy = p1.vy - p2.vy
  const relN = dvx * nx + dvy * ny

  // Only collide if approaching
  if (relN <= 0) return

  // Impulse magnitude
  const imp = (2 * relN) / (m1 + m2)

  p1.vx -= imp * m2 * nx
  p1.vy -= imp * m2 * ny
  p2.vx += imp * m1 * nx
  p2.vy += imp * m1 * ny

  // Separate overlapping particles
  const overlap = (p1.r + p2.r) - dist
  if (overlap > 0) {
    const sep = overlap / 2
    p1.x -= nx * sep
    p1.y -= ny * sep
    p2.x += nx * sep
    p2.y += ny * sep
  }
}

/** Wall bounce */
function bounceWalls(p: Particle, W: number, H: number) {
  if (p.x - p.r < 0)  { p.x = p.r;      p.vx = Math.abs(p.vx) }
  if (p.x + p.r > W)  { p.x = W - p.r;  p.vx = -Math.abs(p.vx) }
  if (p.y - p.r < 0)  { p.y = p.r;      p.vy = Math.abs(p.vy) }
  if (p.y + p.r > H)  { p.y = H - p.r;  p.vy = -Math.abs(p.vy) }
}

/** Speed → colour: blue (slow) → white → red (fast) */
function speedColor(speed: number, maxSpeed: number): string {
  const t = Math.min(speed / maxSpeed, 1)
  if (t < 0.5) {
    // blue → white
    const s = t * 2
    const r = Math.round(80  + s * (240 - 80))
    const g = Math.round(120 + s * (240 - 120))
    const b = Math.round(220 + s * (240 - 220))
    return `rgb(${r},${g},${b})`
  } else {
    // white → red
    const s = (t - 0.5) * 2
    const r = 240
    const g = Math.round(240 - s * 200)
    const bb = Math.round(240 - s * 230)
    return `rgb(${r},${g},${bb})`
  }
}

// ── Module ───────────────────────────────────

const BrownianMotionModule: PhysicsModule<BrownianState> = {
  id: 'brownian-motion',

  metadata: {
    title:       '布朗运动',
    titleEn:     'Brownian Motion',
    description: '花粉颗粒在液体分子撞击下的随机游走。温度越高，分子运动越剧烈，轨迹越复杂。',
    descriptionEn:
      'A heavy pollen grain buffeted by hundreds of invisible gas molecules performs a random walk. ' +
      'Einstein\'s 1905 analysis of this phenomenon confirmed the atomic theory of matter.',
    theory:    ['thermodynamics', 'classical-mechanics'],
    mathLevel: 1,
    renderer:  'canvas2d',
    linkedModules: ['ising-model', 'double-pendulum'],
  },

  init(canvas, params): BrownianState {
    const T = Number(params.temperature ?? 1.0)
    return initState(canvas, T)
  },

  tick(state, dt, params): BrownianState {
    // Reset
    if (params.reset === true) {
      return initState({ width: state.width, height: state.height } as unknown as HTMLElement, Number(params.temperature ?? 1.0))
    }

    const T       = Number(params.temperature ?? 1.0)
    const maxTrail = Number(params.trailLength ?? 300)
    const { gas, tracer, trail } = state
    const W = state.width
    const H = state.height

    // Clamp dt for stability
    const step = Math.min(dt, 0.033)
    const SUBSTEPS = 3
    const subDt = step / SUBSTEPS

    for (let sub = 0; sub < SUBSTEPS; sub++) {
      // Move gas particles
      for (const p of gas) {
        p.x += p.vx * subDt * 60
        p.y += p.vy * subDt * 60
        bounceWalls(p, W, H)
      }

      // Move tracer
      tracer.x += tracer.vx * subDt * 60
      tracer.y += tracer.vy * subDt * 60
      bounceWalls(tracer, W, H)

      // Gas ↔ tracer collisions
      for (const p of gas) {
        const dx = tracer.x - p.x
        const dy = tracer.y - p.y
        const distSq = dx * dx + dy * dy
        const minDist = tracer.r + p.r
        if (distSq < minDist * minDist) {
          elasticCollide(p, GAS_MASS, tracer, TRACER_MASS)
        }
      }
    }

    // Speed rescaling: maintain target temperature (thermostat)
    // Measure current mean KE of gas
    let sumKE = 0
    for (const p of gas) sumKE += p.vx * p.vx + p.vy * p.vy
    const meanKE = sumKE / gas.length
    const targetKE = T * 2  // 2D: mean KE = kT per particle (k=1, T normalised)
    if (meanKE > 1e-6) {
      const scale = Math.sqrt(targetKE / meanKE)
      for (const p of gas) {
        p.vx *= scale
        p.vy *= scale
      }
    }

    // Update trail
    const lastPt = trail[trail.length - 1]
    const dx = tracer.x - lastPt.x
    const dy = tracer.y - lastPt.y
    if (dx * dx + dy * dy > 4) {
      trail.push({ x: tracer.x, y: tracer.y })
      if (trail.length > maxTrail) trail.shift()
    }

    return { ...state, time: state.time + dt }
  },

  render(state, canvas, params): void {
    const el = canvas as HTMLCanvasElement
    const ctx = el.getContext('2d')
    if (!ctx) return

    // Update canvas size
    const W = el.width  = el.clientWidth
    const H = el.height = el.clientHeight
    state.width  = W
    state.height = H

    const showGas     = params.showGas     !== false
    const colorBySpeed = params.colorBySpeed !== false
    const { gas, tracer, trail } = state

    // Background
    ctx.fillStyle = '#06060f'
    ctx.fillRect(0, 0, W, H)

    // Subtle grid
    ctx.strokeStyle = 'rgba(240,237,232,0.03)'
    ctx.lineWidth = 1
    const gridSize = 60
    for (let x = gridSize; x < W; x += gridSize) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = gridSize; y < H; y += gridSize) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // Gas particles
    if (showGas) {
      // Estimate max speed for colour range
      let maxSpeed = 0
      for (const p of gas) {
        const s = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        if (s > maxSpeed) maxSpeed = s
      }
      maxSpeed = Math.max(maxSpeed, 0.1)

      for (const p of gas) {
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = colorBySpeed ? speedColor(speed, maxSpeed) : 'rgba(150,170,220,0.55)'
        ctx.fill()
      }
    }

    // Trail
    if (trail.length > 1) {
      ctx.lineWidth = 1.5
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.85
        ctx.strokeStyle = `rgba(200,149,90,${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y)
        ctx.lineTo(trail[i].x, trail[i].y)
        ctx.stroke()
      }
    }

    // Tracer glow
    const glowGrad = ctx.createRadialGradient(tracer.x, tracer.y, 0, tracer.x, tracer.y, tracer.r * 3)
    glowGrad.addColorStop(0,   'rgba(200,149,90,0.30)')
    glowGrad.addColorStop(1,   'rgba(200,149,90,0.00)')
    ctx.beginPath()
    ctx.arc(tracer.x, tracer.y, tracer.r * 3, 0, Math.PI * 2)
    ctx.fillStyle = glowGrad
    ctx.fill()

    // Tracer particle
    const tracerGrad = ctx.createRadialGradient(
      tracer.x - tracer.r * 0.3, tracer.y - tracer.r * 0.3, 1,
      tracer.x, tracer.y, tracer.r
    )
    tracerGrad.addColorStop(0, '#f0c080')
    tracerGrad.addColorStop(1, '#c8955a')
    ctx.beginPath()
    ctx.arc(tracer.x, tracer.y, tracer.r, 0, Math.PI * 2)
    ctx.fillStyle = tracerGrad
    ctx.fill()

    // Tracer border
    ctx.strokeStyle = 'rgba(240,192,128,0.6)'
    ctx.lineWidth   = 1.5
    ctx.stroke()

    // Label: "pollen grain"
    ctx.font      = `10px monospace`
    ctx.fillStyle = 'rgba(240,237,232,0.38)'
    ctx.textAlign = 'center'
    const labelY  = tracer.y + tracer.r + 14
    ctx.fillText('花粉 / pollen', tracer.x, labelY > H - 8 ? tracer.y - tracer.r - 6 : labelY)

    // Temperature indicator (top-left)
    const T = Number(params.temperature ?? 1.0)
    ctx.textAlign = 'left'
    ctx.font = '11px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.30)'
    ctx.fillText(`T = ${T.toFixed(2)}`, 14, 20)
    ctx.fillText(`n = ${gas.length} molecules`, 14, 36)
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'temperature',
        label: '温度',
        labelEn: 'Temperature',
        min: 0.1, max: 5.0, step: 0.05, default: 1.0,
      },
      {
        type: 'slider',
        id: 'trailLength',
        label: '轨迹长度',
        labelEn: 'Trail Length',
        min: 0, max: 600, step: 10, default: 300,
      },
      {
        type: 'toggle',
        id: 'showGas',
        label: '显示气体分子',
        labelEn: 'Show Gas Molecules',
        default: true,
      },
      {
        type: 'toggle',
        id: 'colorBySpeed',
        label: '按速度着色',
        labelEn: 'Color by Speed',
        default: true,
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
    // nothing to clean up for Canvas 2D
  },
}

export default BrownianMotionModule

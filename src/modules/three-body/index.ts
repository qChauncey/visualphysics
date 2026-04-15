// ─────────────────────────────────────────────
//  Module: Three-Body Problem (Classical Chaos)
//  Renderer: Canvas 2D
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

type Body = { x: number; y: number; vx: number; vy: number; m: number }
type TrailPoint = { x: number; y: number }

type ThreeBodyState = {
  bodies: Body[]
  trails: Array<Array<TrailPoint>>
  t: number
  trailMax: number
}

// Figure-8 initial conditions (Chenciner-Montgomery 2000)
// All masses = 1, G = 1
function makeFigureEight(): Body[] {
  return [
    { x: -0.97000436, y:  0.24308753, vx:  0.93240737 / 2, vy:  0.86473146 / 2, m: 1 },
    { x:  0,          y:  0,          vx: -0.93240737,      vy: -0.86473146,      m: 1 },
    { x:  0.97000436, y: -0.24308753, vx:  0.93240737 / 2, vy:  0.86473146 / 2, m: 1 },
  ]
}

// Gravitational acceleration on body i from all others
function accel(
  bodies: Body[],
  i: number,
  G: number,
  eps: number
): [number, number] {
  let ax = 0
  let ay = 0
  const bi = bodies[i]
  for (let j = 0; j < bodies.length; j++) {
    if (j === i) continue
    const bj = bodies[j]
    const dx = bj.x - bi.x
    const dy = bj.y - bi.y
    const r2 = dx * dx + dy * dy + eps * eps
    const r3 = Math.pow(r2, 1.5)
    const f = (G * bj.m) / r3
    ax += f * dx
    ay += f * dy
  }
  return [ax, ay]
}

// Flatten bodies into a state vector for RK4:
// [x0, y0, vx0, vy0, x1, y1, vx1, vy1, x2, y2, vx2, vy2]
function bodiesToVec(bodies: Body[]): number[] {
  const v: number[] = []
  for (const b of bodies) {
    v.push(b.x, b.y, b.vx, b.vy)
  }
  return v
}

function vecToBodies(v: number[], masses: number[]): Body[] {
  const bodies: Body[] = []
  for (let i = 0; i < masses.length; i++) {
    const base = i * 4
    bodies.push({
      x: v[base],
      y: v[base + 1],
      vx: v[base + 2],
      vy: v[base + 3],
      m: masses[i],
    })
  }
  return bodies
}

function derivatives(v: number[], masses: number[], G: number, eps: number): number[] {
  const bodies = vecToBodies(v, masses)
  const dv: number[] = []
  for (let i = 0; i < bodies.length; i++) {
    const [ax, ay] = accel(bodies, i, G, eps)
    dv.push(bodies[i].vx, bodies[i].vy, ax, ay)
  }
  return dv
}

function rk4Step(bodies: Body[], dt: number, G: number, eps: number): Body[] {
  const masses = bodies.map((b) => b.m)
  const state = bodiesToVec(bodies)
  const deriv = (s: number[]) => derivatives(s, masses, G, eps)

  const k1 = deriv(state)
  const k2 = deriv(state.map((s, i) => s + (dt / 2) * k1[i]))
  const k3 = deriv(state.map((s, i) => s + (dt / 2) * k2[i]))
  const k4 = deriv(state.map((s, i) => s + dt * k3[i]))

  const next = state.map((s, i) => s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
  return vecToBodies(next, masses)
}

// Colors for the three bodies
const BODY_COLORS = ['#c8955a', '#60a5fa', '#a8e6cf'] as const

const ThreeBodyModule: PhysicsModule<ThreeBodyState> = {
  id: 'three-body',
  metadata: {
    title: '三体问题',
    titleEn: 'Three-Body Problem',
    description:
      '牛顿引力下三个天体的混沌运动，对初始条件极度敏感。展示经典力学的混沌边界。',
    descriptionEn:
      'Chaotic motion of three gravitating bodies under Newtonian gravity — exquisitely sensitive to initial conditions.',
    theory: ['classical-mechanics'],
    mathLevel: 1,
    renderer: 'canvas2d',
  },

  init(_canvas, params): ThreeBodyState {
    const trailMax = (params.trailLen as number) ?? 200
    return {
      bodies: makeFigureEight(),
      trails: [[], [], []],
      t: 0,
      trailMax,
    }
  },

  tick(state, dt, params): ThreeBodyState {
    // Handle reset button
    if (params.reset === true) {
      return {
        bodies: makeFigureEight(),
        trails: [[], [], []],
        t: 0,
        trailMax: params.trailLen as number,
      }
    }

    const G = params.G as number
    const speed = params.speed as number
    const trailMax = params.trailLen as number
    const eps = 0.01

    const subSteps = Math.max(1, Math.round(speed * 8))
    const subDt = dt / subSteps

    let bodies = state.bodies
    for (let step = 0; step < subSteps; step++) {
      bodies = rk4Step(bodies, subDt, G, eps)
    }

    // Update trails
    const trails = state.trails.map((trail, i) => {
      const next = [...trail, { x: bodies[i].x, y: bodies[i].y }]
      if (next.length > trailMax) next.splice(0, next.length - trailMax)
      return next
    })

    return {
      bodies,
      trails,
      t: state.t + dt,
      trailMax,
    }
  },

  render(state, canvas, params): void {
    const cvs = canvas as HTMLCanvasElement
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const w = cvs.width
    const h = cvs.height

    // Clear to black
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, w, h)

    // World-to-canvas transform
    // ±2 world units should fit within 80% of min(w, h)
    const baseScale = (Math.min(w, h) * 0.8) / 4 // 4 = diameter of ±2 range
    const zoom = (params._zoom as number) ?? 1
    const panX = (params._panX as number) ?? 0
    const panY = (params._panY as number) ?? 0
    const scale = baseScale * zoom

    const cx = w / 2 + panX
    const cy = h / 2 + panY

    const toScreenX = (wx: number) => cx + wx * scale
    const toScreenY = (wy: number) => cy - wy * scale  // flip Y: world up = screen up

    // Faint axis cross at origin
    ctx.save()
    ctx.globalAlpha = 0.08
    ctx.strokeStyle = '#f0ede8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.lineTo(w, cy)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, 0)
    ctx.lineTo(cx, h)
    ctx.stroke()
    ctx.restore()

    // Draw trails with fading opacity
    for (let bi = 0; bi < 3; bi++) {
      const trail = state.trails[bi]
      if (trail.length < 2) continue

      const color = BODY_COLORS[bi]
      // Parse hex color to use in rgba
      const r = parseInt(color.slice(1, 3), 16)
      const g = parseInt(color.slice(3, 5), 16)
      const b = parseInt(color.slice(5, 7), 16)

      // Draw segments with increasing opacity towards the newest point
      for (let i = 1; i < trail.length; i++) {
        const alpha = (i / trail.length) * 0.7
        ctx.beginPath()
        ctx.moveTo(toScreenX(trail[i - 1].x), toScreenY(trail[i - 1].y))
        ctx.lineTo(toScreenX(trail[i].x), toScreenY(trail[i].y))
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`
        ctx.lineWidth = 1.2
        ctx.stroke()
      }
    }

    // Draw bodies as filled circles
    for (let bi = 0; bi < 3; bi++) {
      const body = state.bodies[bi]
      const sx = toScreenX(body.x)
      const sy = toScreenY(body.y)
      ctx.beginPath()
      ctx.arc(sx, sy, 6, 0, Math.PI * 2)
      ctx.fillStyle = BODY_COLORS[bi]
      ctx.fill()
      // Subtle glow outline
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'
      ctx.lineWidth = 1
      ctx.stroke()
    }
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'G',
        label: '引力常数',
        labelEn: 'Gravity G',
        min: 0.1,
        max: 3,
        step: 0.05,
        default: 1,
      },
      {
        type: 'slider',
        id: 'speed',
        label: '速度',
        labelEn: 'Speed',
        min: 0.5,
        max: 4,
        step: 0.5,
        default: 1,
      },
      {
        type: 'slider',
        id: 'trailLen',
        label: '轨迹长度',
        labelEn: 'Trail length',
        min: 50,
        max: 600,
        step: 50,
        default: 200,
      },
      {
        type: 'button',
        id: 'reset',
        label: '重置',
        labelEn: 'Reset',
      },
    ]
  },

  destroy() {},
}

export default ThreeBodyModule

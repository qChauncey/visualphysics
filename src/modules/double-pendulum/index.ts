// ─────────────────────────────────────────────
//  Module: Double Pendulum (Classical Chaos)
//  Renderer: Canvas 2D
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import { rk4 } from '@/core/physics-engine'

// State: [θ1, ω1, θ2, ω2]
type State = {
  q: number[]          // [θ1, ω1, θ2, ω2]
  trail1: [number, number][]
  trail2: [number, number][]
  animId: number | null
  ctx: CanvasRenderingContext2D | null
}

const G = 9.81

function derivatives(q: number[], p: Params): number[] {
  const [θ1, ω1, θ2, ω2] = q
  const m1 = p.mass1 as number
  const m2 = p.mass2 as number
  const l1 = p.length1 as number
  const l2 = p.length2 as number

  const Δ = θ2 - θ1
  const M = m1 + m2
  const denom1 = (2 * M - m2 * Math.cos(2 * Δ)) * l1
  const denom2 = (2 * M - m2 * Math.cos(2 * Δ)) * l2

  const α1 = (-G * (2 * M) * Math.sin(θ1)
    - m2 * G * Math.sin(θ1 - 2 * θ2)
    - 2 * Math.sin(Δ) * m2 * (ω2 * ω2 * l2 + ω1 * ω1 * l1 * Math.cos(Δ))
  ) / denom1

  const α2 = (2 * Math.sin(Δ) * (
    ω1 * ω1 * l1 * M
    + G * M * Math.cos(θ1)
    + ω2 * ω2 * l2 * m2 * Math.cos(Δ)
  )) / denom2

  return [ω1, α1, ω2, α2]
}

const DoublePendulumModule: PhysicsModule<State> = {
  id: 'double-pendulum',
  metadata: {
    title: '双摆混沌',
    titleEn: 'Double Pendulum',
    description:    '经典混沌系统——初始条件的微小差异导致完全不同的轨迹',
    descriptionEn:  'A classical chaotic system — tiny differences in initial conditions lead to completely divergent trajectories.',
    theory: ['classical-mechanics'],
    mathLevel: 2,
    renderer: 'canvas2d',
  },

  init(canvas, params): State {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!
    return {
      q: [params.theta1 as number, 0, params.theta2 as number, 0],
      trail1: [],
      trail2: [],
      animId: null,
      ctx,
    }
  },

  tick(state, dt, params): State {
    const steps = 10
    let q = state.q
    for (let i = 0; i < steps; i++) {
      q = rk4(q, (s) => derivatives(s, params), dt / steps)
    }

    const l1 = params.length1 as number
    const l2 = params.length2 as number
    const canvas = state.ctx!.canvas
    const cx = canvas.width / 2
    const cy = canvas.height * 0.35
    const scale = Math.min(canvas.width, canvas.height) * 0.3

    const x1 = cx + Math.sin(q[0]) * l1 * scale
    const y1 = cy + Math.cos(q[0]) * l1 * scale
    const x2 = x1 + Math.sin(q[2]) * l2 * scale
    const y2 = y1 + Math.cos(q[2]) * l2 * scale

    const maxTrail = 300
    const trail1 = [...state.trail1, [x1, y1] as [number, number]].slice(-maxTrail)
    const trail2 = [...state.trail2, [x2, y2] as [number, number]].slice(-maxTrail)

    return { ...state, q, trail1, trail2 }
  },

  render(state, canvas, params) {
    const ctx = state.ctx!
    const w = (canvas as HTMLCanvasElement).width
    const h = (canvas as HTMLCanvasElement).height
    const cx = w / 2
    const cy = h * 0.35
    const scale = Math.min(w, h) * 0.3
    const l1 = params.length1 as number
    const l2 = params.length2 as number
    const [θ1, , θ2] = state.q

    // Background fade for trail effect
    ctx.fillStyle = 'rgba(10, 10, 20, 0.18)'
    ctx.fillRect(0, 0, w, h)

    // Draw trails
    const drawTrail = (trail: [number, number][], color: string) => {
      if (trail.length < 2) return
      ctx.beginPath()
      ctx.moveTo(trail[0][0], trail[0][1])
      for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i][0], trail[i][1])
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.stroke()
    }
    drawTrail(state.trail1, 'rgba(100, 180, 255, 0.4)')
    drawTrail(state.trail2, 'rgba(255, 120, 80, 0.6)')

    // Pivot
    const x1 = cx + Math.sin(θ1) * l1 * scale
    const y1 = cy + Math.cos(θ1) * l1 * scale
    const x2 = x1 + Math.sin(θ2) * l2 * scale
    const y2 = y1 + Math.cos(θ2) * l2 * scale

    // Rods
    ctx.strokeStyle = 'rgba(200, 200, 220, 0.85)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()

    // Pivot point
    ctx.fillStyle = '#aaaacc'
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill()

    // Mass 1
    ctx.fillStyle = '#64b4ff'
    ctx.beginPath(); ctx.arc(x1, y1, 10, 0, Math.PI * 2); ctx.fill()

    // Mass 2
    ctx.fillStyle = '#ff7850'
    ctx.beginPath(); ctx.arc(x2, y2, 10, 0, Math.PI * 2); ctx.fill()
  },

  getControls(): ControlDefinition[] {
    return [
      { type: 'slider', id: 'theta1',  label: '初始角度 1', labelEn: 'Initial Angle 1', min: 0,   max: Math.PI, step: 0.01, default: Math.PI * 0.8 },
      { type: 'slider', id: 'theta2',  label: '初始角度 2', labelEn: 'Initial Angle 2', min: 0,   max: Math.PI, step: 0.01, default: Math.PI * 0.9 },
      { type: 'slider', id: 'mass1',   label: '质量 1',     labelEn: 'Mass 1',           min: 0.5, max: 5,       step: 0.1,  default: 1 },
      { type: 'slider', id: 'mass2',   label: '质量 2',     labelEn: 'Mass 2',           min: 0.5, max: 5,       step: 0.1,  default: 1 },
      { type: 'slider', id: 'length1', label: '杆长 1',     labelEn: 'Rod Length 1',     min: 0.2, max: 1,       step: 0.05, default: 0.5 },
      { type: 'slider', id: 'length2', label: '杆长 2',     labelEn: 'Rod Length 2',     min: 0.2, max: 1,       step: 0.05, default: 0.5 },
      { type: 'button', id: 'reset',   label: '重置',       labelEn: 'Reset' },
    ]
  },

  destroy() {},
}

export default DoublePendulumModule

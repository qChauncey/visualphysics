// Hydrogen Orbital — Canvas 2D probability density cross-section
// Visualises |ψ(r,θ)|² in the xz plane (y=0) for 1s, 2s, 2p, 3s, 3p, 3d.
// All distances in atomic units (Bohr radii, a₀).

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── State ────────────────────────────────────────────────────────────────────

type HydrogenState = {
  ctx: CanvasRenderingContext2D
  offCanvas: HTMLCanvasElement | null   // 400×400 cached render
  cachedOrbital: string
  cachedScale: number
}

// ── Wave functions ───────────────────────────────────────────────────────────
// Returns |ψ(x,z)|² (un-normalised, but correctly shaped) for the xz cross-
// section (y=0).  x and z are in Bohr radii.

function psi2(orbital: string, x: number, z: number): number {
  const r    = Math.sqrt(x * x + z * z)
  const cosT = r > 1e-12 ? z / r : 0   // cosθ = z/r

  switch (orbital) {
    // n=1 ─────────────────────────────────────────────────────────────────────
    case '1s':
      return Math.exp(-2 * r)

    // n=2 ─────────────────────────────────────────────────────────────────────
    case '2s': {
      const u = (2 - r) * Math.exp(-r / 2)
      return u * u
    }
    case '2p': {
      // 2p_z : ψ ∝ r · cosθ · e^(-r/2)
      const u = r * cosT * Math.exp(-r / 2)
      return u * u
    }

    // n=3 ─────────────────────────────────────────────────────────────────────
    case '3s': {
      const u = (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3)
      return u * u
    }
    case '3p': {
      // 3p_z : ψ ∝ (6-r) · r · cosθ · e^(-r/3)
      const u = (6 - r) * r * cosT * Math.exp(-r / 3)
      return u * u
    }
    case '3d': {
      // 3d_z² : ψ ∝ r² · (3cos²θ-1) · e^(-r/3)
      const u = r * r * (3 * cosT * cosT - 1) * Math.exp(-r / 3)
      return u * u
    }

    default:
      return 0
  }
}

// ── Orbital metadata ──────────────────────────────────────────────────────────

const ORBITAL_INFO: Record<string, { label: string; qn: string; defaultScale: number }> = {
  '1s': { label: '1s',   qn: 'n=1  l=0  m=0',  defaultScale: 8  },
  '2s': { label: '2s',   qn: 'n=2  l=0  m=0',  defaultScale: 22 },
  '2p': { label: '2p_z', qn: 'n=2  l=1  m=0',  defaultScale: 22 },
  '3s': { label: '3s',   qn: 'n=3  l=0  m=0',  defaultScale: 38 },
  '3p': { label: '3p_z', qn: 'n=3  l=1  m=0',  defaultScale: 38 },
  '3d': { label: '3d_z²',qn: 'n=3  l=2  m=0',  defaultScale: 38 },
}

// ── Rendering ────────────────────────────────────────────────────────────────

/** Build a 400×400 offscreen canvas with the |ψ|² colour map. */
function buildOrbitalCanvas(orbital: string, scale: number): HTMLCanvasElement {
  const SIZE = 400
  const off  = document.createElement('canvas')
  off.width  = SIZE
  off.height = SIZE
  const offCtx = off.getContext('2d')!

  const imgData = offCtx.createImageData(SIZE, SIZE)
  const data    = imgData.data
  const half    = SIZE / 2

  // --- First pass: sample at 4px intervals to find the max value -----------
  let maxVal = 0
  for (let py = 0; py < SIZE; py += 4) {
    for (let px = 0; px < SIZE; px += 4) {
      const x =  (px - half) / half * scale
      const z = -(py - half) / half * scale
      const v = psi2(orbital, x, z)
      if (v > maxVal) maxVal = v
    }
  }
  if (maxVal === 0) maxVal = 1

  // --- Second pass: fill every pixel ----------------------------------------
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x =  (px - half) / half * scale
      const z = -(py - half) / half * scale

      // Logarithmic rescaling brings out both the dense core and faint cloud
      let val = psi2(orbital, x, z) / maxVal
      val = Math.log1p(val * 80) / Math.log1p(80)
      val = Math.min(1, val)

      const i = (py * SIZE + px) * 4

      // Colormap: black → deep indigo → cyan → bright white
      if (val < 0.35) {
        const t = val / 0.35
        data[i]     = Math.round(20  * t)
        data[i + 1] = Math.round(10  * t)
        data[i + 2] = Math.round(160 * t)
      } else if (val < 0.65) {
        const t = (val - 0.35) / 0.30
        data[i]     = Math.round(20  + 30  * t)
        data[i + 1] = Math.round(10  + 190 * t)
        data[i + 2] = Math.round(160 + 95  * t)
      } else {
        const t = (val - 0.65) / 0.35
        data[i]     = Math.round(50  + 205 * t)
        data[i + 1] = Math.round(200 + 55  * t)
        data[i + 2] = Math.round(255)
      }
      data[i + 3] = 255
    }
  }

  offCtx.putImageData(imgData, 0, 0)
  return off
}

// ── Module ───────────────────────────────────────────────────────────────────

const HydrogenOrbitalModule: PhysicsModule<HydrogenState> = {
  id: 'hydrogen-orbital',

  metadata: {
    title:       '氢原子轨道',
    titleEn:     'Hydrogen Orbitals',
    description: '量子力学概率云——氢原子电子波函数 xz 截面 (1s / 2p / 3d)',
    theory:      ['quantum-mechanics'],
    mathLevel:   3,
    renderer:    'canvas2d',
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  init(canvas, _params): HydrogenState {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!
    return { ctx, offCanvas: null, cachedOrbital: '', cachedScale: -1 }
  },

  tick(state, _dt, params): HydrogenState {
    const orbital = params.orbital as string
    const scale   = params.scale   as number

    // Only recompute when something changes (computation is ~5–30 ms)
    if (
      state.cachedOrbital === orbital &&
      Math.abs(state.cachedScale - scale) < 0.05
    ) {
      return state
    }

    const offCanvas = buildOrbitalCanvas(orbital, scale)
    return { ...state, offCanvas, cachedOrbital: orbital, cachedScale: scale }
  },

  render(state, canvas, params) {
    const ctx = state.ctx
    const el  = canvas as HTMLCanvasElement
    const w   = el.width
    const h   = el.height

    ctx.fillStyle = '#00000a'
    ctx.fillRect(0, 0, w, h)

    if (!state.offCanvas) return

    // Draw orbital image — keep it square, centred
    const size = Math.min(w, h) * 0.88
    const ox   = (w - size) / 2
    const oy   = (h - size) / 2
    ctx.drawImage(state.offCanvas, ox, oy, size, size)

    // Subtle border
    ctx.strokeStyle = 'rgba(100,120,180,0.15)'
    ctx.lineWidth   = 1
    ctx.strokeRect(ox, oy, size, size)

    // ── Scale bar ──────────────────────────────────────────────────────────
    const scale     = params.scale as number
    const barBohrs  = Math.max(1, Math.round(scale / 4))
    const barPx     = (barBohrs / scale) * size
    const barX      = ox + 14
    const barY      = oy + size - 18

    ctx.strokeStyle = 'rgba(255,255,255,0.45)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(barX, barY)
    ctx.lineTo(barX + barPx, barY)
    ctx.stroke()
    // ticks
    ctx.beginPath()
    ctx.moveTo(barX, barY - 4); ctx.lineTo(barX, barY + 4)
    ctx.moveTo(barX + barPx, barY - 4); ctx.lineTo(barX + barPx, barY + 4)
    ctx.stroke()

    const fontSize = Math.max(10, Math.round(w * 0.014))
    ctx.font      = `${fontSize}px monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(`${barBohrs} a₀`, barX + barPx + 5, barY + 4)

    // ── Orbital label ──────────────────────────────────────────────────────
    const info = ORBITAL_INFO[params.orbital as string]
    if (info) {
      const labelSize = Math.max(15, Math.round(w * 0.022))
      ctx.font      = `bold ${labelSize}px monospace`
      ctx.fillStyle = 'rgba(160,210,255,0.92)'
      ctx.fillText(info.label, ox + 14, oy + labelSize + 8)

      ctx.font      = `${Math.max(10, Math.round(w * 0.013))}px monospace`
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.fillText(info.qn, ox + 14, oy + labelSize + 8 + Math.round(w * 0.018) + 4)
    }
  },

  // ── Controls ───────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'select',
        id:      'orbital',
        label:   '轨道',
        options: [
          { value: '1s', label: '1s  （基态，球对称）' },
          { value: '2s', label: '2s  （径向节面）'     },
          { value: '2p', label: '2p_z（哑铃形）'       },
          { value: '3s', label: '3s  （两个节面）'     },
          { value: '3p', label: '3p_z（三叶形）'       },
          { value: '3d', label: '3d_z²（甜甜圈+环）'   },
        ],
        default: '1s',
      },
      {
        type:    'slider',
        id:      'scale',
        label:   '视野（Bohr 半径）',
        min:     4,
        max:     50,
        step:    1,
        default: 8,
      },
    ]
  },

  destroy() {},
}

export default HydrogenOrbitalModule

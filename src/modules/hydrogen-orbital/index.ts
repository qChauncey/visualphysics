// Hydrogen Orbital — Canvas 2D probability density cross-section
// Visualises |ψ(r,θ)|² in the xz plane (y=0) for 1s, 2s, 2p, 3s, 3p, 3d.
// All distances in atomic units (Bohr radii, a₀).
// Supports mouse interaction: pan, zoom, hover probe.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── State ────────────────────────────────────────────────────────────────────

type HydrogenState = {
  ctx:           CanvasRenderingContext2D
  offCanvas:     HTMLCanvasElement | null   // cached colour map
  cachedOrbital: string
  cachedScale:   number
  maxVal:        number                     // peak |ψ|² for normalising the probe
}

// ── Wave functions ────────────────────────────────────────────────────────────
// Returns |ψ(x,z)|² (un-normalised, correctly shaped) for the xz cross-section.

function psi2(orbital: string, x: number, z: number): number {
  const r    = Math.sqrt(x * x + z * z)
  const cosT = r > 1e-12 ? z / r : 0

  switch (orbital) {
    case '1s':
      return Math.exp(-2 * r)
    case '2s': {
      const u = (2 - r) * Math.exp(-r / 2)
      return u * u
    }
    case '2p': {
      const u = r * cosT * Math.exp(-r / 2)
      return u * u
    }
    case '3s': {
      const u = (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3)
      return u * u
    }
    case '3p': {
      const u = (6 - r) * r * cosT * Math.exp(-r / 3)
      return u * u
    }
    case '3d': {
      const u = r * r * (3 * cosT * cosT - 1) * Math.exp(-r / 3)
      return u * u
    }
    default:
      return 0
  }
}

// ── Orbital metadata ──────────────────────────────────────────────────────────

const ORBITAL_INFO: Record<string, { label: string; qn: string }> = {
  '1s': { label: '1s',    qn: 'n=1  l=0  m=0' },
  '2s': { label: '2s',    qn: 'n=2  l=0  m=0' },
  '2p': { label: '2p_z',  qn: 'n=2  l=1  m=0' },
  '3s': { label: '3s',    qn: 'n=3  l=0  m=0' },
  '3p': { label: '3p_z',  qn: 'n=3  l=1  m=0' },
  '3d': { label: '3d_z²', qn: 'n=3  l=2  m=0' },
}

// ── Rendering ────────────────────────────────────────────────────────────────

/** Build a 400×400 offscreen canvas with the |ψ|² colour map. */
function buildOrbitalCanvas(
  orbital: string,
  scale: number,
): { canvas: HTMLCanvasElement; maxVal: number } {
  const SIZE = 400
  const off  = document.createElement('canvas')
  off.width  = SIZE
  off.height = SIZE
  const offCtx = off.getContext('2d')!
  const imgData = offCtx.createImageData(SIZE, SIZE)
  const data    = imgData.data
  const half    = SIZE / 2

  // First pass: find the peak value via sparse sampling
  let maxVal = 0
  for (let py = 0; py < SIZE; py += 4) {
    for (let px = 0; px < SIZE; px += 4) {
      const v = psi2(orbital, (px - half) / half * scale, -(py - half) / half * scale)
      if (v > maxVal) maxVal = v
    }
  }
  if (maxVal === 0) maxVal = 1

  // Second pass: fill every pixel
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const x =  (px - half) / half * scale
      const z = -(py - half) / half * scale

      let val = psi2(orbital, x, z) / maxVal
      // Logarithmic rescaling brings out both the dense core and faint cloud
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
        data[i + 2] = 255
      }
      data[i + 3] = 255
    }
  }

  offCtx.putImageData(imgData, 0, 0)
  return { canvas: off, maxVal }
}

// ── Module ────────────────────────────────────────────────────────────────────

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

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(canvas, _params): HydrogenState {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!
    return { ctx, offCanvas: null, cachedOrbital: '', cachedScale: -1, maxVal: 1 }
  },

  tick(state, _dt, params): HydrogenState {
    const orbital = params.orbital as string
    const scale   = params.scale   as number

    // Only recompute when orbital type or scale changes (~5–30 ms per build)
    if (state.cachedOrbital === orbital && Math.abs(state.cachedScale - scale) < 0.05) {
      return state
    }

    const { canvas: offCanvas, maxVal } = buildOrbitalCanvas(orbital, scale)
    return { ...state, offCanvas, maxVal, cachedOrbital: orbital, cachedScale: scale }
  },

  render(state, canvas, params) {
    const ctx     = state.ctx
    const el      = canvas as HTMLCanvasElement
    const w       = el.width
    const h       = el.height
    const orbital = params.orbital as string
    const scale   = params.scale   as number

    // View state injected by ModuleViewer via viewRef
    const panX = typeof params._panX === 'number' ? params._panX : 0
    const panY = typeof params._panY === 'number' ? params._panY : 0
    const zoom = typeof params._zoom === 'number' ? params._zoom : 1
    const mx   = typeof params._mouseX === 'number' ? params._mouseX : -1
    const my   = typeof params._mouseY === 'number' ? params._mouseY : -1

    ctx.fillStyle = '#00000a'
    ctx.fillRect(0, 0, w, h)

    if (!state.offCanvas) return

    // ── Draw orbital image with pan / zoom ───────────────────────────────────
    const baseSize   = Math.min(w, h) * 0.88
    const scaledSize = baseSize * zoom
    const ox = (w - scaledSize) / 2 + panX
    const oy = (h - scaledSize) / 2 + panY

    ctx.drawImage(state.offCanvas, ox, oy, scaledSize, scaledSize)

    // Subtle border around the image
    ctx.strokeStyle = 'rgba(100,120,180,0.15)'
    ctx.lineWidth   = 1
    ctx.strokeRect(ox, oy, scaledSize, scaledSize)

    // ── Scale bar — fixed to viewport bottom-left ────────────────────────────
    const pxPerBohr  = scaledSize / (2 * scale)
    const barBohrs   = Math.max(1, Math.round(scale / zoom / 3))
    const barPx      = barBohrs * pxPerBohr
    const barX       = 20
    const barY       = h - 24
    const barFontSz  = Math.max(9, Math.round(w * 0.013))

    ctx.strokeStyle = 'rgba(255,255,255,0.40)'
    ctx.lineWidth   = 1.5
    ctx.beginPath()
    ctx.moveTo(barX,          barY); ctx.lineTo(barX + barPx, barY)
    ctx.moveTo(barX,          barY - 4); ctx.lineTo(barX,          barY + 4)
    ctx.moveTo(barX + barPx,  barY - 4); ctx.lineTo(barX + barPx,  barY + 4)
    ctx.stroke()
    ctx.font      = `${barFontSz}px monospace`
    ctx.fillStyle = 'rgba(255,255,255,0.40)'
    ctx.fillText(`${barBohrs} a₀`, barX + barPx + 6, barY + 4)

    // ── Orbital label — fixed to viewport top-left ───────────────────────────
    const info = ORBITAL_INFO[orbital]
    if (info) {
      const labelSz = Math.max(15, Math.round(w * 0.022))
      ctx.font      = `bold ${labelSz}px monospace`
      ctx.fillStyle = 'rgba(160,210,255,0.92)'
      ctx.fillText(info.label, 20, 20 + labelSz)
      ctx.font      = `${Math.max(10, Math.round(w * 0.013))}px monospace`
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.fillText(info.qn, 20, 20 + labelSz + Math.round(w * 0.018) + 6)
    }

    // ── Hover probe ──────────────────────────────────────────────────────────
    const insideImage = mx >= ox && mx <= ox + scaledSize && my >= oy && my <= oy + scaledSize
    if (mx >= 0 && my >= 0 && insideImage) {
      // Convert canvas pixel → physics coordinates (Bohr radii)
      const fracX =  (mx - ox) / scaledSize
      const fracY =  (my - oy) / scaledSize
      const physX =  (fracX - 0.5) * 2 * scale
      const physZ = -(fracY - 0.5) * 2 * scale
      const r       = Math.sqrt(physX * physX + physZ * physZ)
      const theta   = Math.atan2(Math.sqrt(physX * physX), physZ) * 180 / Math.PI
      const rawPsi2 = psi2(orbital, physX, physZ)
      const norm    = state.maxVal > 0 ? rawPsi2 / state.maxVal : 0

      // Crosshair
      ctx.save()
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'
      ctx.lineWidth   = 0.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(mx, oy);             ctx.lineTo(mx, oy + scaledSize)
      ctx.moveTo(ox, my);             ctx.lineTo(ox + scaledSize, my)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Cursor dot
      ctx.fillStyle = 'rgba(255,255,255,0.80)'
      ctx.beginPath()
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
      ctx.fill()

      // Info card
      const fSz   = Math.max(10, Math.round(w * 0.013))
      const lines = [
        `r  = ${r.toFixed(2)} a₀`,
        `θ  = ${theta.toFixed(1)}°`,
        `|ψ|² ∝ ${norm.toFixed(3)}`,
      ]
      const lineH  = fSz + 5
      const padX   = 10
      const padY   = 8
      const cardW  = 140
      const cardH  = lines.length * lineH + padY * 2
      let   cardX  = mx + 16
      let   cardY  = my - cardH / 2
      if (cardX + cardW > w - 8) cardX = mx - cardW - 16
      if (cardY < 8)             cardY = 8
      if (cardY + cardH > h - 8) cardY = h - cardH - 8

      ctx.fillStyle   = 'rgba(4,4,12,0.88)'
      ctx.fillRect(cardX, cardY, cardW, cardH)
      ctx.strokeStyle = 'rgba(100,160,220,0.30)'
      ctx.lineWidth   = 0.5
      ctx.strokeRect(cardX, cardY, cardW, cardH)

      ctx.font      = `${fSz}px "JetBrains Mono", monospace`
      ctx.fillStyle = 'rgba(160,210,255,0.90)'
      lines.forEach((line, i) => {
        ctx.fillText(line, cardX + padX, cardY + padY + (i + 1) * lineH - 2)
      })
    }
  },

  // ── Controls ──────────────────────────────────────────────────────────────

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

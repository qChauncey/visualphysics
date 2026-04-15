// Gravitational Lensing — general-relativistic light bending
//
// A point-mass gravitational lens deflects background starlight,
// producing two images per source and (when aligned) an Einstein ring.
//
// Physics:
//   Lens equation:  β = θ − θ_E² / θ
//   Einstein radius: θ_E = √(M)  (normalised units)
//   Image positions: θ± = (β ± √(β² + 4·θ_E²)) / 2
//   Magnification:   μ± = |θ±⁴ / (θ±⁴ − θ_E⁴)|

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Types ────────────────────────────────────────────────────────────────────

type Star = {
  /** source-plane x in normalised lens units */
  sx: number
  /** source-plane y */
  sy: number
  /** 0–1 brightness */
  brightness: number
  /** apparent radius in px */
  size: number
}

type LensState = {
  ctx: CanvasRenderingContext2D
  stars: Star[]
  t: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Solve the point-mass lens equation for a source at (bx, by) */
function lensImages(
  bx: number,
  by: number,
  thetaE: number,
): { x1: number; y1: number; mu1: number; x2: number; y2: number; mu2: number } | null {
  const beta = Math.sqrt(bx * bx + by * by)
  if (beta < 1e-6) return null // on-axis → ring, handled separately

  const disc = beta * beta + 4 * thetaE * thetaE
  const sqrtDisc = Math.sqrt(disc)

  const thetaPlus = (beta + sqrtDisc) / 2
  const thetaMinus = (beta - sqrtDisc) / 2 // negative → opposite side

  // direction unit vector
  const dx = bx / beta
  const dy = by / beta

  // image positions
  const x1 = dx * thetaPlus
  const y1 = dy * thetaPlus
  const x2 = dx * thetaMinus
  const y2 = dy * thetaMinus

  // magnification: μ = |θ⁴ / (θ⁴ − θ_E⁴)|
  const te4 = thetaE * thetaE * thetaE * thetaE
  const tp4 = thetaPlus * thetaPlus * thetaPlus * thetaPlus
  const tm4 = thetaMinus * thetaMinus * thetaMinus * thetaMinus
  const mu1 = Math.abs(tp4 / (tp4 - te4 + 1e-12))
  const mu2 = Math.abs(tm4 / (tm4 - te4 + 1e-12))

  return { x1, y1, mu1, x2, y2, mu2 }
}

// ── Module ───────────────────────────────────────────────────────────────────

const GravitationalLensing: PhysicsModule<LensState> = {
  id: 'gravitational-lensing',

  metadata: {
    title: '引力透镜',
    titleEn: 'Gravitational Lensing',
    description:
      '大质量天体弯曲周围时空，使背景光源形成弧形像或爱因斯坦环。',
    descriptionEn:
      'Massive objects bend spacetime, distorting background light into arcs and Einstein rings.',
    theory: ['general-relativity', 'astrophysics'],
    mathLevel: 2,
    renderer: 'canvas2d',
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  init(canvas, _params): LensState {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!

    // Generate 300 random background stars
    const stars: Star[] = []
    for (let i = 0; i < 300; i++) {
      stars.push({
        sx: (Math.random() - 0.5) * 12,  // [-6, 6]
        sy: (Math.random() - 0.5) * 12,
        brightness: 0.3 + Math.random() * 0.7,
        size: 1 + Math.random() * 1.5,
      })
    }

    return { ctx, stars, t: 0 }
  },

  tick(state, dt, _params): LensState {
    return { ...state, t: state.t + dt }
  },

  render(state, canvas, params) {
    const ctx = state.ctx
    const el = canvas as HTMLCanvasElement
    const W = el.width
    const H = el.height
    const cx = W / 2
    const cy = H / 2

    const mass = (params.mass as number) ?? 1.5
    const sourceX = (params.sourceX as number) ?? 0.3
    const sourceY = (params.sourceY as number) ?? 0.2
    const showGrid = (params.showGrid as boolean) ?? false

    const thetaE = Math.sqrt(mass)
    const scale = Math.min(W, H) * 0.12

    // ── Background ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#060810'
    ctx.fillRect(0, 0, W, H)

    // ── Lensed star field ──────────────────────────────────────────────────
    for (const star of state.stars) {
      const imgs = lensImages(star.sx, star.sy, thetaE)
      if (!imgs) continue

      // Clamp magnification for rendering size
      const m1 = Math.min(imgs.mu1, 8)
      const m2 = Math.min(imgs.mu2, 8)

      const drawStar = (ix: number, iy: number, mu: number, baseSz: number, bright: number) => {
        const px = cx + ix * scale
        const py = cy - iy * scale
        if (px < -10 || px > W + 10 || py < -10 || py > H + 10) return

        const r = baseSz * Math.sqrt(mu) * 0.6
        const a = Math.min(1, bright * Math.sqrt(mu) * 0.5)

        // Slight blue-white tint
        const rb = Math.round(200 + 55 * bright)
        const gb = Math.round(210 + 45 * bright)
        const bb = 255

        ctx.beginPath()
        ctx.arc(px, py, Math.max(0.5, r), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${rb},${gb},${bb},${a})`
        ctx.fill()
      }

      drawStar(imgs.x1, imgs.y1, m1, star.size, star.brightness)
      drawStar(imgs.x2, imgs.y2, m2, star.size, star.brightness * 0.6)
    }

    // ── Distortion grid (optional) ─────────────────────────────────────────
    if (showGrid) {
      const gridN = 20
      const gridRange = 5
      ctx.strokeStyle = 'rgba(100,180,255,0.12)'
      ctx.lineWidth = 0.7

      // Horizontal grid lines
      for (let j = -gridN; j <= gridN; j++) {
        const by = (j / gridN) * gridRange
        ctx.beginPath()
        let first = true
        for (let i = -gridN * 2; i <= gridN * 2; i++) {
          const bx = (i / (gridN * 2)) * gridRange * 2
          const imgs = lensImages(bx, by, thetaE)
          if (!imgs) { first = true; continue }

          const px = cx + imgs.x1 * scale
          const py = cy - imgs.y1 * scale
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Secondary image grid
        ctx.beginPath()
        first = true
        for (let i = -gridN * 2; i <= gridN * 2; i++) {
          const bx = (i / (gridN * 2)) * gridRange * 2
          const imgs = lensImages(bx, by, thetaE)
          if (!imgs) { first = true; continue }

          const px = cx + imgs.x2 * scale
          const py = cy - imgs.y2 * scale
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }

      // Vertical grid lines
      for (let i = -gridN; i <= gridN; i++) {
        const bx = (i / gridN) * gridRange
        ctx.beginPath()
        let first = true
        for (let j = -gridN * 2; j <= gridN * 2; j++) {
          const by = (j / (gridN * 2)) * gridRange * 2
          const imgs = lensImages(bx, by, thetaE)
          if (!imgs) { first = true; continue }

          const px = cx + imgs.x1 * scale
          const py = cy - imgs.y1 * scale
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Secondary image grid
        ctx.beginPath()
        first = true
        for (let j = -gridN * 2; j <= gridN * 2; j++) {
          const by = (j / (gridN * 2)) * gridRange * 2
          const imgs = lensImages(bx, by, thetaE)
          if (!imgs) { first = true; continue }

          const px = cx + imgs.x2 * scale
          const py = cy - imgs.y2 * scale
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()
      }
    }

    // ── Einstein ring ──────────────────────────────────────────────────────
    const ringR = thetaE * scale
    const sourceBeta = Math.sqrt(sourceX * sourceX + sourceY * sourceY)

    // Always draw faint ring for reference
    ctx.beginPath()
    ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(200,149,90,0.15)'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // When source is near-aligned, draw bright Einstein ring
    if (sourceBeta < thetaE * 0.3) {
      const ringBrightness = 1 - sourceBeta / (thetaE * 0.3)

      // Outer glow
      const ringGlow = ctx.createRadialGradient(cx, cy, ringR - 8, cx, cy, ringR + 8)
      ringGlow.addColorStop(0, `rgba(200,149,90,0)`)
      ringGlow.addColorStop(0.4, `rgba(200,149,90,${0.3 * ringBrightness})`)
      ringGlow.addColorStop(0.5, `rgba(220,175,110,${0.6 * ringBrightness})`)
      ringGlow.addColorStop(0.6, `rgba(200,149,90,${0.3 * ringBrightness})`)
      ringGlow.addColorStop(1, `rgba(200,149,90,0)`)

      ctx.beginPath()
      ctx.arc(cx, cy, ringR + 8, 0, Math.PI * 2)
      ctx.arc(cx, cy, Math.max(0, ringR - 8), 0, Math.PI * 2, true)
      ctx.fillStyle = ringGlow
      ctx.fill()

      // Bright ring line
      ctx.beginPath()
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(200,149,90,${0.8 * ringBrightness})`
      ctx.lineWidth = 2.5
      ctx.stroke()
    }

    // ── Lensed source images (bright copper blobs) ─────────────────────────
    if (sourceBeta >= 1e-4) {
      const imgs = lensImages(sourceX, sourceY, thetaE)
      if (imgs) {
        const drawSourceImage = (ix: number, iy: number, mu: number) => {
          const px = cx + ix * scale
          const py = cy - iy * scale
          const r = Math.min(20, 4 + 3 * Math.sqrt(Math.min(mu, 15)))

          // Glow halo
          const glow = ctx.createRadialGradient(px, py, 0, px, py, r * 2.5)
          glow.addColorStop(0, 'rgba(200,149,90,0.5)')
          glow.addColorStop(0.4, 'rgba(200,149,90,0.2)')
          glow.addColorStop(1, 'rgba(200,149,90,0)')
          ctx.beginPath()
          ctx.arc(px, py, r * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()

          // Core
          ctx.beginPath()
          ctx.arc(px, py, r, 0, Math.PI * 2)
          ctx.fillStyle = '#c8955a'
          ctx.fill()

          // Bright centre
          ctx.beginPath()
          ctx.arc(px, py, r * 0.4, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255,220,180,0.8)'
          ctx.fill()
        }

        drawSourceImage(imgs.x1, imgs.y1, imgs.mu1)
        drawSourceImage(imgs.x2, imgs.y2, imgs.mu2)
      }
    }

    // ── Source position indicator (faint cross in source plane) ─────────────
    {
      const spx = cx + sourceX * scale
      const spy = cy - sourceY * scale
      const sz = 6
      ctx.strokeStyle = 'rgba(200,149,90,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(spx - sz, spy)
      ctx.lineTo(spx + sz, spy)
      ctx.moveTo(spx, spy - sz)
      ctx.lineTo(spx, spy + sz)
      ctx.stroke()

      // Tiny label
      const fSz = Math.max(9, Math.round(Math.min(W, H) * 0.014))
      ctx.font = `${fSz}px monospace`
      ctx.fillStyle = 'rgba(200,149,90,0.35)'
      ctx.fillText('source', spx + 8, spy - 4)
    }

    // ── Lens object (dark circle with blue glow) ───────────────────────────
    {
      const lensR = Math.max(6, scale * 0.15)

      // Blue glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, lensR * 5)
      glow.addColorStop(0, 'rgba(26,48,96,0.6)')
      glow.addColorStop(0.3, 'rgba(26,48,96,0.25)')
      glow.addColorStop(0.7, 'rgba(15,25,60,0.08)')
      glow.addColorStop(1, 'rgba(10,15,40,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, lensR * 5, 0, Math.PI * 2)
      ctx.fillStyle = glow
      ctx.fill()

      // Dark core
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, lensR)
      core.addColorStop(0, '#0a0e18')
      core.addColorStop(0.8, '#0e1420')
      core.addColorStop(1, '#1a3060')
      ctx.beginPath()
      ctx.arc(cx, cy, lensR, 0, Math.PI * 2)
      ctx.fillStyle = core
      ctx.fill()

      // Subtle rim
      ctx.beginPath()
      ctx.arc(cx, cy, lensR, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(60,100,180,0.3)'
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // ── Labels ─────────────────────────────────────────────────────────────
    {
      const fSz = Math.max(10, Math.round(Math.min(W, H) * 0.015))
      ctx.font = `italic ${fSz}px monospace`
      ctx.fillStyle = 'rgba(200,149,90,0.45)'

      // θ_E label along the Einstein radius
      const labelAngle = -Math.PI / 4
      const lx = cx + Math.cos(labelAngle) * (ringR + 12)
      const ly = cy + Math.sin(labelAngle) * (ringR + 12)
      ctx.fillText('θ_E', lx, ly)

      // Dashed line from center to label
      ctx.setLineDash([3, 4])
      ctx.strokeStyle = 'rgba(200,149,90,0.18)'
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(labelAngle) * ringR, cy + Math.sin(labelAngle) * ringR)
      ctx.stroke()
      ctx.setLineDash([])

      // Info text — bottom left
      const infoSz = Math.max(9, Math.round(Math.min(W, H) * 0.012))
      ctx.font = `${infoSz}px monospace`
      ctx.fillStyle = 'rgba(240,237,232,0.25)'
      ctx.fillText(`θ_E = ${thetaE.toFixed(2)}`, 14, H - 30)
      ctx.fillText(`β = ${sourceBeta.toFixed(2)}`, 14, H - 14)
    }
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'mass',
        label: '透镜质量',
        labelEn: 'Lens mass',
        min: 0.5,
        max: 5,
        step: 0.1,
        default: 1.5,
      },
      {
        type: 'slider',
        id: 'sourceX',
        label: '光源 X',
        labelEn: 'Source X',
        min: -3,
        max: 3,
        step: 0.1,
        default: 0.3,
      },
      {
        type: 'slider',
        id: 'sourceY',
        label: '光源 Y',
        labelEn: 'Source Y',
        min: -3,
        max: 3,
        step: 0.1,
        default: 0.2,
      },
      {
        type: 'toggle',
        id: 'showGrid',
        label: '畸变网格',
        labelEn: 'Distortion grid',
        default: false,
      },
    ]
  },

  destroy() {},
}

export default GravitationalLensing

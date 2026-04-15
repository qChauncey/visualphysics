// ─────────────────────────────────────────────
//  Module: Minkowski Diagram (Special Relativity)
//  Renderer: Canvas 2D
//
//  Interactive spacetime diagram with Lorentz transformations.
//  Rest frame (ct, x) + boosted frame (ct', x') with smooth interpolation.
//  Light cones remain at 45° — the fundamental invariant.
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition } from '@/types/physics'

type MinkowskiState = {
  currentBeta: number   // smoothly interpolated toward target
  t: number
  ctx: CanvasRenderingContext2D | null
}

// ── Events in the rest frame ──────────────────────────────────────────────────

const EVENTS: { label: string; ct: number; x: number }[] = [
  { label: 'A', ct: 2, x: 0 },
  { label: 'B', ct: 1, x: 2 },
  { label: 'C', ct: 3, x: 1 },
]

// ── Drawing helpers ───────────────────────────────────────────────────────────

/** Convert spacetime (x, ct) to canvas pixel coordinates */
function toCanvas(
  x: number,
  ct: number,
  cx: number,
  cy: number,
  scale: number,
): [number, number] {
  return [cx + x * scale, cy - ct * scale]
}

/** Draw a line from (x1,ct1) to (x2,ct2) in spacetime coords */
function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number, ct1: number,
  x2: number, ct2: number,
  cx: number, cy: number, scale: number,
  color: string,
  lineWidth: number = 1,
  dash: number[] = [],
) {
  const [px1, py1] = toCanvas(x1, ct1, cx, cy, scale)
  const [px2, py2] = toCanvas(x2, ct2, cx, cy, scale)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(px1, py1)
  ctx.lineTo(px2, py2)
  ctx.stroke()
  ctx.restore()
}

/** Draw text at a spacetime position with pixel offsets */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number, ct: number,
  cx: number, cy: number, scale: number,
  color: string,
  fontSize: number,
  dx: number = 0, dy: number = 0,
) {
  const [px, py] = toCanvas(x, ct, cx, cy, scale)
  ctx.save()
  ctx.font = `${fontSize}px monospace`
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, px + dx, py + dy)
  ctx.restore()
}

// ── Module ────────────────────────────────────────────────────────────────────

const MinkowskiDiagram: PhysicsModule<MinkowskiState> = {
  id: 'minkowski-diagram',

  metadata: {
    title: '闵可夫斯基图',
    titleEn: 'Minkowski Diagram',
    description: '闵可夫斯基时空图展示洛伦兹变换——不同参考系的时间轴与空间轴如何旋转，光锥保持不变。',
    descriptionEn: 'Minkowski spacetime diagram showing Lorentz transformations — how time and space axes rotate between reference frames while light cones remain invariant.',
    theory: ['special-relativity'],
    mathLevel: 2,
    renderer: 'canvas2d',
  },

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(canvas, _params): MinkowskiState {
    const ctx = (canvas as HTMLCanvasElement).getContext('2d')!
    return {
      currentBeta: 0,
      t: 0,
      ctx,
    }
  },

  tick(state, dt, params): MinkowskiState {
    const targetBeta = params.velocity as number
    // Smooth exponential interpolation toward target
    const rate = 4.0 // speed of convergence
    const diff = targetBeta - state.currentBeta
    const currentBeta = Math.abs(diff) < 0.001
      ? targetBeta
      : state.currentBeta + diff * (1 - Math.exp(-rate * dt))

    return {
      ...state,
      currentBeta,
      t: state.t + dt,
    }
  },

  render(state, canvas, params) {
    const ctx = state.ctx!
    const el = canvas as HTMLCanvasElement
    const W = el.width
    const H = el.height

    const beta = state.currentBeta
    const gamma = 1 / Math.sqrt(1 - beta * beta)
    const showGrid = params.showGrid as boolean
    const showHyperbola = params.showHyperbola as boolean
    const showEvents = params.showEvents as boolean

    // Canvas center = origin of spacetime diagram
    const cx = W / 2
    const cy = H / 2

    // Scale: ~80px per unit, adjusted for screen size
    const baseScale = 80
    const zoom = (params._zoom as number) || 1
    const scale = baseScale * zoom * Math.min(W, H) / 800

    // How many grid units fit on screen
    const rangeX = (W / 2) / scale + 1
    const rangeCt = (H / 2) / scale + 1
    const maxN = Math.ceil(Math.max(rangeX, rangeCt)) + 1

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#060810'
    ctx.fillRect(0, 0, W, H)

    // ── Light cones (background layer) ──────────────────────────────────────
    // Faint filled regions
    const lightColor = 'rgba(232, 197, 90, 0.04)'
    // Future light cone (upper triangle)
    ctx.fillStyle = lightColor
    ctx.beginPath()
    ctx.moveTo(cx, cy) // origin
    ctx.lineTo(cx - rangeCt * scale, cy - rangeCt * scale) // upper-left along x = -ct
    ctx.lineTo(cx + rangeCt * scale, cy - rangeCt * scale) // upper-right along x = ct
    ctx.closePath()
    ctx.fill()
    // Past light cone (lower triangle)
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx - rangeCt * scale, cy + rangeCt * scale)
    ctx.lineTo(cx + rangeCt * scale, cy + rangeCt * scale)
    ctx.closePath()
    ctx.fill()

    // Light cone lines (x = +-ct)
    const lightLineColor = 'rgba(232, 197, 90, 0.40)'
    const lcExtent = Math.max(rangeX, rangeCt) + 2
    drawLine(ctx, -lcExtent, lcExtent, lcExtent, -lcExtent, cx, cy, scale, lightLineColor, 1.5)
    drawLine(ctx, -lcExtent, -lcExtent, lcExtent, lcExtent, cx, cy, scale, lightLineColor, 1.5)

    // ── Rest frame grid ─────────────────────────────────────────────────────
    const restAxisColor = 'rgba(240, 237, 232, 0.30)'
    const restGridColor = 'rgba(240, 237, 232, 0.08)'
    const restTickColor = 'rgba(240, 237, 232, 0.45)'

    if (showGrid) {
      // Horizontal grid lines (ct = const)
      for (let i = -maxN; i <= maxN; i++) {
        if (i === 0) continue
        drawLine(ctx, -rangeX - 1, i, rangeX + 1, i, cx, cy, scale, restGridColor, 0.5)
      }
      // Vertical grid lines (x = const)
      for (let i = -maxN; i <= maxN; i++) {
        if (i === 0) continue
        drawLine(ctx, i, -rangeCt - 1, i, rangeCt + 1, cx, cy, scale, restGridColor, 0.5)
      }
    }

    // Rest frame axes
    drawLine(ctx, -rangeX - 1, 0, rangeX + 1, 0, cx, cy, scale, restAxisColor, 1.5) // x-axis
    drawLine(ctx, 0, -rangeCt - 1, 0, rangeCt + 1, cx, cy, scale, restAxisColor, 1.5) // ct-axis

    // Tick marks and labels on rest frame axes
    const tickSize = 4
    const labelSize = Math.max(10, Math.round(scale * 0.16))

    for (let i = -maxN; i <= maxN; i++) {
      if (i === 0) continue
      if (Math.abs(i) > rangeX) continue
      // x-axis ticks
      const [tx, ty] = toCanvas(i, 0, cx, cy, scale)
      ctx.strokeStyle = restTickColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tx, ty - tickSize)
      ctx.lineTo(tx, ty + tickSize)
      ctx.stroke()
      // label
      ctx.font = `${labelSize}px monospace`
      ctx.fillStyle = restTickColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(`${i}`, tx, ty + tickSize + 2)
    }

    for (let i = -maxN; i <= maxN; i++) {
      if (i === 0) continue
      if (Math.abs(i) > rangeCt) continue
      // ct-axis ticks
      const [tx, ty] = toCanvas(0, i, cx, cy, scale)
      ctx.strokeStyle = restTickColor
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(tx - tickSize, ty)
      ctx.lineTo(tx + tickSize, ty)
      ctx.stroke()
      // label
      ctx.font = `${labelSize}px monospace`
      ctx.fillStyle = restTickColor
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(`${i}`, tx - tickSize - 3, ty)
    }

    // Axis labels (rest frame)
    const axLabelSize = Math.max(12, Math.round(scale * 0.2))
    drawLabel(ctx, 'x', rangeX - 0.3, 0, cx, cy, scale, restTickColor, axLabelSize, 8, 16)
    drawLabel(ctx, 'ct', 0, rangeCt - 0.3, cx, cy, scale, restTickColor, axLabelSize, 10, 4)

    // ── Boosted frame ───────────────────────────────────────────────────────
    if (Math.abs(beta) > 0.001) {
      const copperAxis = 'rgba(200, 149, 90, 0.85)'
      const copperGrid = 'rgba(200, 149, 90, 0.15)'
      const copperTick = 'rgba(200, 149, 90, 0.70)'

      // Boosted ct'-axis direction: (beta, 1) normalised — a line with slope 1/beta in (x, ct) space
      // ct'-axis: x = beta * ct  (tilts toward light cone)
      // x'-axis: ct = beta * x   (tilts toward light cone)
      const extent = Math.max(rangeX, rangeCt) + 2

      // ct'-axis (line x = beta * ct through origin)
      drawLine(ctx, -beta * extent, -extent, beta * extent, extent, cx, cy, scale, copperAxis, 2)
      // x'-axis (line ct = beta * x through origin)
      drawLine(ctx, -extent, -beta * extent, extent, beta * extent, cx, cy, scale, copperAxis, 2)

      // Boosted grid lines
      if (showGrid) {
        // Lines of constant ct' (parallel to x'-axis)
        // ct' = n means gamma*(ct - beta*x) = n → ct = beta*x + n/gamma
        // Direction of x'-axis: (1, beta) in (x, ct)
        for (let n = -maxN; n <= maxN; n++) {
          if (n === 0) continue
          const ctIntercept = n / gamma
          // Parametric: x = s, ct = beta*s + ctIntercept
          const s1 = -extent
          const s2 = extent
          drawLine(
            ctx,
            s1, beta * s1 + ctIntercept,
            s2, beta * s2 + ctIntercept,
            cx, cy, scale, copperGrid, 0.5,
          )
        }
        // Lines of constant x' (parallel to ct'-axis)
        // x' = n means gamma*(x - beta*ct) = n → x = beta*ct + n/gamma
        // Direction of ct'-axis: (beta, 1) in (x, ct)
        for (let n = -maxN; n <= maxN; n++) {
          if (n === 0) continue
          const xIntercept = n / gamma
          // Parametric: ct = s, x = beta*s + xIntercept
          const s1 = -extent
          const s2 = extent
          drawLine(
            ctx,
            beta * s1 + xIntercept, s1,
            beta * s2 + xIntercept, s2,
            cx, cy, scale, copperGrid, 0.5,
          )
        }
      }

      // Tick marks on boosted axes
      // ct'-axis ticks: at ct' = n, the spacetime point is (x, ct) = (n*beta*gamma, n*gamma) / gamma = (n*beta, n) ...
      // Actually: ct' = n, x' = 0 → ct = gamma*n, x = gamma*beta*n ... no wait:
      // Inverse Lorentz: ct = gamma*(ct' + beta*x'), x = gamma*(x' + beta*ct')
      // At x'=0, ct'=n: ct = gamma*n, x = gamma*beta*n
      for (let n = -maxN; n <= maxN; n++) {
        if (n === 0) continue
        const ctR = gamma * n
        const xR = gamma * beta * n
        // Check if on screen
        const [px, py] = toCanvas(xR, ctR, cx, cy, scale)
        if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue

        // Tick perpendicular to ct'-axis direction
        // ct'-axis direction in canvas: (beta*scale, -scale) → perpendicular: (scale, beta*scale)
        const pLen = tickSize + 1
        const perpX = 1 / Math.sqrt(1 + beta * beta)
        const perpY = beta / Math.sqrt(1 + beta * beta)
        ctx.strokeStyle = copperTick
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px - perpX * pLen, py - perpY * pLen)
        ctx.lineTo(px + perpX * pLen, py + perpY * pLen)
        ctx.stroke()
      }

      // x'-axis ticks: at x' = n, ct' = 0 → ct = gamma*beta*n, x = gamma*n
      for (let n = -maxN; n <= maxN; n++) {
        if (n === 0) continue
        const ctR = gamma * beta * n
        const xR = gamma * n
        const [px, py] = toCanvas(xR, ctR, cx, cy, scale)
        if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue

        // Tick perpendicular to x'-axis
        // x'-axis direction in canvas: (scale, -beta*scale) → perp: (beta*scale, scale)
        const pLen = tickSize + 1
        const perpX = -beta / Math.sqrt(1 + beta * beta)
        const perpY = 1 / Math.sqrt(1 + beta * beta)
        ctx.strokeStyle = copperTick
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(px - perpX * pLen, py + perpY * pLen)
        ctx.lineTo(px + perpX * pLen, py - perpY * pLen)
        ctx.stroke()
      }

      // Axis labels (boosted frame) — place at the ends
      const labelDist = Math.min(extent - 1, rangeCt - 1)
      const ctPx = toCanvas(beta * labelDist, labelDist, cx, cy, scale)
      const xPx = toCanvas(labelDist, beta * labelDist, cx, cy, scale)
      ctx.font = `bold ${axLabelSize}px monospace`
      ctx.fillStyle = copperAxis
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText("ct'", ctPx[0] + 8, ctPx[1] + 4)
      ctx.fillText("x'", xPx[0] + 4, xPx[1] + 16)
    }

    // ── Hyperbolic calibration curves ───────────────────────────────────────
    if (showHyperbola) {
      const hyperColor = 'rgba(160, 180, 220, 0.30)'
      const intervals = [1, 4] // ct^2 - x^2 = s^2

      for (const s2 of intervals) {
        const s = Math.sqrt(s2)

        // Timelike hyperbola: ct^2 - x^2 = s^2, ct > 0
        // ct = sqrt(x^2 + s^2)
        ctx.strokeStyle = hyperColor
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])

        // Upper branch
        ctx.beginPath()
        let first = true
        for (let i = -200; i <= 200; i++) {
          const x = (i / 200) * (rangeX + 1)
          const ct2 = x * x + s2
          if (ct2 < 0) continue
          const ct = Math.sqrt(ct2)
          const [px, py] = toCanvas(x, ct, cx, cy, scale)
          if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Lower branch (ct < 0)
        ctx.beginPath()
        first = true
        for (let i = -200; i <= 200; i++) {
          const x = (i / 200) * (rangeX + 1)
          const ct2 = x * x + s2
          if (ct2 < 0) continue
          const ct = -Math.sqrt(ct2)
          const [px, py] = toCanvas(x, ct, cx, cy, scale)
          if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Spacelike hyperbola: x^2 - ct^2 = s^2, x > 0
        // x = sqrt(ct^2 + s^2)
        // Right branch
        ctx.beginPath()
        first = true
        for (let i = -200; i <= 200; i++) {
          const ct = (i / 200) * (rangeCt + 1)
          const x2 = ct * ct + s2
          if (x2 < 0) continue
          const x = Math.sqrt(x2)
          const [px, py] = toCanvas(x, ct, cx, cy, scale)
          if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Left branch
        ctx.beginPath()
        first = true
        for (let i = -200; i <= 200; i++) {
          const ct = (i / 200) * (rangeCt + 1)
          const x2 = ct * ct + s2
          if (x2 < 0) continue
          const x = -Math.sqrt(x2)
          const [px, py] = toCanvas(x, ct, cx, cy, scale)
          if (px < -50 || px > W + 50 || py < -50 || py > H + 50) continue
          if (first) { ctx.moveTo(px, py); first = false }
          else ctx.lineTo(px, py)
        }
        ctx.stroke()

        // Label the hyperbola
        const labelCt = s * 1.1
        const [lx, ly] = toCanvas(0.3, labelCt, cx, cy, scale)
        ctx.setLineDash([])
        ctx.font = `${Math.max(9, labelSize - 1)}px monospace`
        ctx.fillStyle = 'rgba(160, 180, 220, 0.50)'
        ctx.textAlign = 'left'
        ctx.fillText(`s²=${s2}`, lx, ly - 4)
      }

      ctx.setLineDash([])
    }

    // ── Worldlines ──────────────────────────────────────────────────────────
    const wlExtent = rangeCt + 1

    // Stationary object at x=0 (vertical blue line)
    drawLine(ctx, 0, -wlExtent, 0, wlExtent, cx, cy, scale, 'rgba(96, 165, 250, 0.70)', 2.5)

    // Moving object at v=0.3c starting from origin (tilted green line)
    const v2 = 0.3
    drawLine(
      ctx,
      -v2 * wlExtent, -wlExtent, v2 * wlExtent, wlExtent,
      cx, cy, scale, 'rgba(74, 222, 128, 0.70)', 2,
    )

    // Light ray from origin (on light cone, already drawn but add a brighter highlight)
    drawLine(ctx, 0, 0, wlExtent, wlExtent, cx, cy, scale, 'rgba(232, 197, 90, 0.65)', 1.5)

    // Worldline labels
    const wlLabelSize = Math.max(10, Math.round(scale * 0.16))
    const wlLabelY = Math.min(rangeCt - 0.5, 4.5)
    drawLabel(ctx, 'v=0', 0, wlLabelY, cx, cy, scale, 'rgba(96, 165, 250, 0.80)', wlLabelSize, 6, -2)
    drawLabel(ctx, 'v=0.3c', v2 * wlLabelY, wlLabelY, cx, cy, scale, 'rgba(74, 222, 128, 0.80)', wlLabelSize, 6, -2)
    drawLabel(ctx, 'light', wlLabelY * 0.85, wlLabelY * 0.85, cx, cy, scale, 'rgba(232, 197, 90, 0.70)', wlLabelSize, 6, 6)

    // ── Events ──────────────────────────────────────────────────────────────
    if (showEvents) {
      const eventColor = '#f0ede8'
      const eventRadius = Math.max(4, scale * 0.06)
      const evLabelSize = Math.max(11, Math.round(scale * 0.18))

      for (const ev of EVENTS) {
        const [px, py] = toCanvas(ev.x, ev.ct, cx, cy, scale)

        // Outer glow
        const grad = ctx.createRadialGradient(px, py, 0, px, py, eventRadius * 3)
        grad.addColorStop(0, 'rgba(200, 149, 90, 0.35)')
        grad.addColorStop(1, 'rgba(200, 149, 90, 0.00)')
        ctx.fillStyle = grad
        ctx.fillRect(px - eventRadius * 3, py - eventRadius * 3, eventRadius * 6, eventRadius * 6)

        // Dot
        ctx.beginPath()
        ctx.arc(px, py, eventRadius, 0, Math.PI * 2)
        ctx.fillStyle = eventColor
        ctx.fill()

        // Label
        ctx.font = `bold ${evLabelSize}px monospace`
        ctx.fillStyle = eventColor
        ctx.textAlign = 'left'
        ctx.textBaseline = 'bottom'
        ctx.fillText(ev.label, px + eventRadius + 3, py - eventRadius)

        // Coordinates
        ctx.font = `${Math.max(9, evLabelSize - 2)}px monospace`
        ctx.fillStyle = 'rgba(240, 237, 232, 0.45)'
        ctx.fillText(`(${ev.x}, ${ev.ct})`, px + eventRadius + 3, py + eventRadius + 2)
      }
    }

    // ── Info overlay ────────────────────────────────────────────────────────
    const infoSize = Math.max(11, Math.round(W * 0.014))
    ctx.font = `${infoSize}px monospace`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'

    const displayBeta = beta.toFixed(3)
    const displayGamma = gamma.toFixed(3)

    ctx.fillStyle = 'rgba(200, 149, 90, 0.75)'
    ctx.fillText(`\u03B2 = ${displayBeta}`, 14, 14)
    ctx.fillText(`\u03B3 = ${displayGamma}`, 14, 14 + infoSize + 4)

    if (Math.abs(beta) > 0.01) {
      ctx.fillStyle = 'rgba(240, 237, 232, 0.35)'
      const tdFactor = gamma.toFixed(2)
      const lcFactor = (1 / gamma).toFixed(2)
      ctx.fillText(`time dilation: \u00D7${tdFactor}`, 14, 14 + (infoSize + 4) * 2)
      ctx.fillText(`length contraction: \u00D7${lcFactor}`, 14, 14 + (infoSize + 4) * 3)
    }

    // ── Origin dot ──────────────────────────────────────────────────────────
    ctx.beginPath()
    ctx.arc(cx, cy, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(240, 237, 232, 0.60)'
    ctx.fill()
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'velocity',
        label: '速度 \u03B2=v/c',
        labelEn: 'Velocity \u03B2=v/c',
        min: -0.95,
        max: 0.95,
        step: 0.05,
        default: 0,
      },
      {
        type: 'toggle',
        id: 'showGrid',
        label: '网格',
        labelEn: 'Grid',
        default: true,
      },
      {
        type: 'toggle',
        id: 'showHyperbola',
        label: '双曲线',
        labelEn: 'Hyperbolas',
        default: false,
      },
      {
        type: 'toggle',
        id: 'showEvents',
        label: '事件',
        labelEn: 'Events',
        default: true,
      },
    ]
  },

  destroy() {},
}

export default MinkowskiDiagram

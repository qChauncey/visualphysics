// Quantum Entanglement — Bell state measurements and correlations
// Bell state |Φ+⟩ = (|00⟩ + |11⟩)/√2
// P(same) = cos²((θA-θB)/2),  QM correlation E(a,b) = cos(θA-θB)
// CHSH inequality: |S| ≤ 2 classically, QM allows up to 2√2 ≈ 2.83

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── Types ────────────────────────────────────────────────────────────────────

type Particle = {
  progress: number    // 0 = center, 1 = detector
  side: 'left' | 'right'
  pairId: number
  result?: number     // ±1 once measured
  flashT: number      // countdown for detector flash
}

type Measurement = {
  a: number           // ±1
  b: number           // ±1
  angleA: number      // degrees
  angleB: number
}

type EntanglementState = {
  t: number
  emitTimer: number
  nextPairId: number
  particles: Particle[]
  measurements: Measurement[]
  lastResultA: number    // last ±1 for detector display
  lastResultB: number
  flashA: number         // flash countdown seconds
  flashB: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function deg2rad(d: number) { return d * Math.PI / 180 }

function correlation(meas: Measurement[]): number {
  if (meas.length === 0) return 0
  const sum = meas.reduce((s, m) => s + m.a * m.b, 0)
  return sum / meas.length
}

// ── Module ───────────────────────────────────────────────────────────────────

const QuantumEntanglement: PhysicsModule<EntanglementState> = {
  id: 'quantum-entanglement',

  metadata: {
    title:         '量子纠缠',
    titleEn:       'Quantum Entanglement',
    description:   '纠缠粒子对的测量结果展现超越经典极限的关联——贝尔不等式的违反。',
    descriptionEn: 'Entangled particle pairs show correlations beyond classical limits — violating Bell\'s inequality.',
    theory:        ['quantum-mechanics'],
    mathLevel:     2,
    renderer:      'canvas2d',
  },

  init(): EntanglementState {
    return {
      t: 0, emitTimer: 0, nextPairId: 0,
      particles: [], measurements: [],
      lastResultA: 1, lastResultB: 1,
      flashA: 0, flashB: 0,
    }
  },

  tick(state, dt, params): EntanglementState {
    const speed  = (params.speed  as number) ?? 1
    const angleA = (params.angleA as number) ?? 0
    const angleB = (params.angleB as number) ?? 45

    let { t, emitTimer, nextPairId, particles, measurements,
          lastResultA, lastResultB, flashA, flashB } = state

    t          += dt * speed
    emitTimer  -= dt * speed
    flashA      = Math.max(0, flashA - dt)
    flashB      = Math.max(0, flashB - dt)

    // ── Emit new pair ─────────────────────────────────────────────────────
    if (emitTimer <= 0) {
      emitTimer = 0.7
      const id = nextPairId++
      particles = [
        ...particles,
        { progress: 0, side: 'left',  pairId: id, flashT: 0 },
        { progress: 0, side: 'right', pairId: id, flashT: 0 },
      ]
    }

    // ── Move particles & measure on arrival ───────────────────────────────
    const newMeasurements: Measurement[] = []

    particles = particles.map(p => {
      const np = { ...p, progress: p.progress + dt * speed * 0.55 }
      if (np.progress >= 1 && np.result === undefined) {
        // Generate correlated results when both in same pair
        const partner = particles.find(q => q.pairId === p.pairId && q.side !== p.side)
        const dTheta  = deg2rad(angleA - angleB)
        // Decide outcome for A first, then correlate B
        const resultA = Math.random() < 0.5 ? 1 : -1
        const pSame   = Math.cos(dTheta / 2) ** 2
        const resultB = (Math.random() < pSame) ? resultA : -resultA

        if (p.side === 'left') {
          np.result = resultA
          flashA    = 0.35
          lastResultA = resultA
          if (partner?.result !== undefined) {
            newMeasurements.push({ a: resultA, b: partner.result, angleA, angleB })
          } else if (!partner) {
            newMeasurements.push({ a: resultA, b: resultB, angleA, angleB })
          }
        } else {
          np.result = resultB
          flashB    = 0.35
          lastResultB = resultB
        }
      }
      return np
    })

    // Remove particles well past detector
    particles = particles.filter(p => p.progress < 1.4)

    // Keep last 300 measurements
    measurements = [...measurements, ...newMeasurements].slice(-300)

    return { t, emitTimer, nextPairId, particles, measurements,
             lastResultA, lastResultB, flashA, flashB }
  },

  render(state, canvas, params) {
    const el  = canvas as HTMLCanvasElement
    const ctx = el.getContext('2d')
    if (!ctx) return

    const W = el.width
    const H = el.height

    const angleA = (params.angleA as number) ?? 0
    const angleB = (params.angleB as number) ?? 45

    // Layout: main area top 62%, plot bottom 38%
    const mainH  = Math.round(H * 0.62)
    const plotH  = H - mainH
    const cx     = W / 2
    const cy     = mainH / 2

    // ── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = '#060810'
    ctx.fillRect(0, 0, W, H)

    // ── Source glow at center ─────────────────────────────────────────────
    const glowR  = 22 + 4 * Math.sin(state.t * 3)
    const srcGrd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
    srcGrd.addColorStop(0,   'rgba(200,149,90,0.90)')
    srcGrd.addColorStop(0.4, 'rgba(200,149,90,0.35)')
    srcGrd.addColorStop(1,   'rgba(200,149,90,0)')
    ctx.beginPath()
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
    ctx.fillStyle = srcGrd
    ctx.fill()

    // ── Particles in flight ───────────────────────────────────────────────
    const detX  = W * 0.08   // left detector x
    const detXR = W * 0.92   // right detector x

    for (const p of state.particles) {
      if (p.progress >= 1) continue
      const x = p.side === 'left'
        ? cx - (cx - detX) * p.progress
        : cx + (detXR - cx) * p.progress

      const alpha = Math.min(1, (1 - p.progress) * 2)
      ctx.beginPath()
      ctx.arc(x, cy, 4, 0, Math.PI * 2)
      ctx.fillStyle = p.side === 'left'
        ? `rgba(96,165,250,${alpha})`
        : `rgba(200,149,90,${alpha})`
      ctx.fill()

      // Trail
      for (let i = 1; i <= 4; i++) {
        const tx2 = p.side === 'left'
          ? cx - (cx - detX) * Math.max(0, p.progress - i * 0.04)
          : cx + (detXR - cx) * Math.max(0, p.progress - i * 0.04)
        ctx.beginPath()
        ctx.arc(tx2, cy, 2.5 - i * 0.4, 0, Math.PI * 2)
        ctx.fillStyle = p.side === 'left'
          ? `rgba(96,165,250,${alpha * 0.25})`
          : `rgba(200,149,90,${alpha * 0.25})`
        ctx.fill()
      }
    }

    // ── Detectors ─────────────────────────────────────────────────────────
    function drawDetector(
      x: number, angle: number,
      lastResult: number, flash: number,
      label: string, colorStr: string
    ) {
      if (!ctx) return
      const R = 28
      // Flash ring
      if (flash > 0) {
        const fa = flash / 0.35
        const fr = lastResult === 1 ? `rgba(74,222,128,${fa * 0.35})` : `rgba(248,113,113,${fa * 0.35})`
        ctx.beginPath()
        ctx.arc(x, cy, R + 10, 0, Math.PI * 2)
        ctx.fillStyle = fr
        ctx.fill()
      }
      // Outer ring
      ctx.beginPath()
      ctx.arc(x, cy, R, 0, Math.PI * 2)
      ctx.strokeStyle = colorStr
      ctx.lineWidth   = 1.5
      ctx.globalAlpha = 0.7
      ctx.stroke()
      ctx.globalAlpha = 1

      // Measurement axis line
      const rad = deg2rad(angle)
      ctx.beginPath()
      ctx.moveTo(x - Math.cos(rad) * R, cy - Math.sin(rad) * R)
      ctx.lineTo(x + Math.cos(rad) * R, cy + Math.sin(rad) * R)
      ctx.strokeStyle = colorStr
      ctx.lineWidth   = 2
      ctx.stroke()

      // Arrow tip
      const ax = x + Math.cos(rad) * R
      const ay = cy + Math.sin(rad) * R
      ctx.beginPath()
      ctx.arc(ax, ay, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = colorStr
      ctx.fill()

      // Last result symbol
      const sym = lastResult === 1 ? '↑' : '↓'
      const symColor = flash > 0
        ? (lastResult === 1 ? '#4ade80' : '#f87171')
        : 'rgba(240,237,232,0.45)'
      ctx.font      = 'bold 16px monospace'
      ctx.fillStyle = symColor
      ctx.textAlign = 'center'
      ctx.fillText(sym, x, cy + 6)

      // Label
      ctx.font      = '10px monospace'
      ctx.fillStyle = colorStr
      ctx.fillText(label, x, cy - R - 8)

      // Angle label
      ctx.font      = '8px monospace'
      ctx.fillStyle = 'rgba(240,237,232,0.4)'
      ctx.fillText(`θ=${angle}°`, x, cy + R + 14)
    }

    drawDetector(detX, angleA, state.lastResultA, state.flashA, 'A', '#60a5fa')
    drawDetector(detXR, angleB, state.lastResultB, state.flashB, 'B', '#c8955a')

    // ── Stats ─────────────────────────────────────────────────────────────
    const corr    = correlation(state.measurements)
    const N       = state.measurements.length
    const deltaThDeg = ((angleA - angleB) % 360 + 360) % 360
    ctx.font      = '9px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.50)'
    ctx.textAlign = 'left'
    ctx.fillText(`N = ${N}`, W - 130, 18)
    ctx.fillText(`⟨AB⟩ = ${corr.toFixed(3)}`, W - 130, 32)
    ctx.fillText(`Δθ = ${deltaThDeg}°`, W - 130, 46)

    // Title label
    ctx.font      = '8px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.25)'
    ctx.textAlign = 'center'
    ctx.fillText('ENTANGLED SOURCE', cx, cy - 36)

    // ── Correlation plot ──────────────────────────────────────────────────
    const px0  = 50, px1 = W - 20
    const py0  = mainH + 12, py1 = H - 18
    const pW   = px1 - px0, pH = py1 - py0
    const pmid = py0 + pH / 2

    // Panel background
    ctx.fillStyle = 'rgba(6,8,16,0.85)'
    ctx.fillRect(0, mainH, W, plotH)
    ctx.strokeStyle = 'rgba(240,237,232,0.08)'
    ctx.lineWidth   = 1
    ctx.beginPath(); ctx.moveTo(0, mainH); ctx.lineTo(W, mainH); ctx.stroke()

    // Axes
    ctx.strokeStyle = 'rgba(240,237,232,0.18)'
    ctx.lineWidth   = 0.7
    ctx.beginPath(); ctx.moveTo(px0, py0); ctx.lineTo(px0, py1); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(px0, pmid); ctx.lineTo(px1, pmid); ctx.stroke()

    // y-axis labels
    ctx.font      = '8px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.30)'
    ctx.textAlign = 'right'
    ctx.fillText('+1', px0 - 4, py0 + 4)
    ctx.fillText(' 0', px0 - 4, pmid + 4)
    ctx.fillText('−1', px0 - 4, py1 + 4)

    // x-axis labels
    ctx.textAlign = 'center'
    for (const deg of [0, 45, 90, 135, 180]) {
      const px2 = px0 + (deg / 180) * pW
      ctx.fillText(`${deg}°`, px2, py1 + 12)
      ctx.beginPath()
      ctx.moveTo(px2, py1 - 3); ctx.lineTo(px2, py1 + 3)
      ctx.strokeStyle = 'rgba(240,237,232,0.15)'
      ctx.lineWidth   = 0.7
      ctx.stroke()
    }

    // Axis labels
    ctx.font      = '8px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.35)'
    ctx.textAlign = 'center'
    ctx.fillText('Δθ', px0 + pW / 2, py1 + 22)
    ctx.save()
    ctx.translate(12, py0 + pH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('E(a,b)', 0, 0)
    ctx.restore()

    // QM theoretical curve: E(Δθ) = cos(Δθ)
    ctx.beginPath()
    for (let deg = 0; deg <= 180; deg += 2) {
      const px2 = px0 + (deg / 180) * pW
      const e  = Math.cos(deg2rad(deg))
      const py2 = pmid - e * (pH / 2)
      deg === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2)
    }
    ctx.strokeStyle = '#c8955a'
    ctx.lineWidth   = 1.5
    ctx.stroke()

    // "cos(Δθ)" label
    ctx.font      = '7px monospace'
    ctx.fillStyle = 'rgba(200,149,90,0.65)'
    ctx.textAlign = 'left'
    ctx.fillText('cos(Δθ)', px0 + 4, py0 + 12)

    // Classical bound: LHV limit is a triangle (piecewise linear)
    ctx.beginPath()
    ctx.moveTo(px0, py0)        // Δθ=0, E=1
    ctx.lineTo(px0 + pW / 2, pmid + pH / 2)  // Δθ=90, E=-1 for CHSH, but classical can go to 0
    // Actually classical LHV correlation is just the piecewise linear version:
    // E_classical(Δθ) = 1 - 2Δθ/π for Δθ ∈ [0,π]
    ctx.beginPath()
    for (let deg = 0; deg <= 180; deg += 2) {
      const px2 = px0 + (deg / 180) * pW
      const e  = 1 - (2 * deg2rad(deg)) / Math.PI
      const py2 = pmid - e * (pH / 2)
      deg === 0 ? ctx.moveTo(px2, py2) : ctx.lineTo(px2, py2)
    }
    ctx.strokeStyle = 'rgba(240,237,232,0.28)'
    ctx.lineWidth   = 1
    ctx.setLineDash([4, 3])
    ctx.stroke()
    ctx.setLineDash([])

    ctx.font      = '7px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.28)'
    ctx.textAlign = 'right'
    ctx.fillText('Classical', px0 + pW - 4, py0 + 22)

    // Measured data points — bin by 10° and average
    const bins: { sum: number; count: number }[] = Array.from({ length: 18 }, () => ({ sum: 0, count: 0 }))
    for (const m of state.measurements) {
      const dDeg = ((m.angleA - m.angleB) % 360 + 360) % 360
      if (dDeg > 180) continue   // only show 0–180 range
      const bi = Math.min(17, Math.floor(dDeg / 10))
      bins[bi].sum   += m.a * m.b
      bins[bi].count += 1
    }
    for (let bi = 0; bi < 18; bi++) {
      if (bins[bi].count < 2) continue
      const deg  = bi * 10 + 5
      const avg  = bins[bi].sum / bins[bi].count
      const px2  = px0 + (deg / 180) * pW
      const py2  = pmid - avg * (pH / 2)
      ctx.beginPath()
      ctx.arc(px2, py2, 3.5, 0, Math.PI * 2)
      ctx.fillStyle = '#b08af0'
      ctx.fill()
    }

    // Current Δθ indicator
    const curDeg = Math.min(180, ((angleA - angleB) % 360 + 360) % 360)
    const curPx  = px0 + (curDeg / 180) * pW
    ctx.beginPath()
    ctx.moveTo(curPx, py0); ctx.lineTo(curPx, py1)
    ctx.strokeStyle = 'rgba(96,165,250,0.35)'
    ctx.lineWidth   = 1
    ctx.setLineDash([3, 3])
    ctx.stroke()
    ctx.setLineDash([])
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider', id: 'angleA',
        label: '探测器A角度', labelEn: 'Detector A angle',
        min: 0, max: 360, step: 5, default: 0,
      },
      {
        type: 'slider', id: 'angleB',
        label: '探测器B角度', labelEn: 'Detector B angle',
        min: 0, max: 360, step: 5, default: 45,
      },
      {
        type: 'slider', id: 'speed',
        label: '速度', labelEn: 'Speed',
        min: 0.5, max: 3, step: 0.5, default: 1,
      },
    ]
  },

  destroy() {},
}

export default QuantumEntanglement

// Gravitational Waves — Binary star inspiral + gravitational wave emission
// A binary system loses energy to gravitational radiation, spiralling inward to merger.
// Einstein's direct prediction, first detected by LIGO in 2015.
//
// Physics (normalised units: G=c=1, total mass M=1):
//   Orbital frequency: ω = sqrt(1/r³)   (Kepler's third law)
//   Peters inspiral:   dr/dt = -η * 8/(15 * r³)   (η = chirp mass parameter)
//   GW strain:         h = (η² / r) * cos(2φ)

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

// ── State ─────────────────────────────────────────────────────────────────────

type Ring = { r: number; amp: number; born: number }

type GWState = {
  r:       number        // orbital separation (normalised units)
  phi:     number        // orbital phase (radians)
  t:       number        // simulation time
  rings:   Ring[]        // expanding wave rings
  strain:  number[]      // last 300 strain values for waveform display
  merged:  boolean
  /** canvas element cached at init for sizing */
  mergeFlashT: number    // seconds since merger (for flash decay); -1 = not merging
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeInitialState(): GWState {
  return {
    r:           4,
    phi:         0,
    t:           0,
    rings:       [],
    strain:      [],
    merged:      false,
    mergeFlashT: -1,
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

const GravitationalWaves: PhysicsModule<GWState> = {
  id: 'gravitational-waves',

  metadata: {
    title:        '引力波',
    titleEn:      'Gravitational Waves',
    description:  '双星系统因引力波辐射失去能量，轨道衰减并合。爱因斯坦广义相对论的直接预言，2015年由LIGO首次探测。',
    descriptionEn: "A binary system loses energy to gravitational radiation, spiralling inward to merger. Einstein's direct prediction, first detected by LIGO in 2015.",
    theory:       ['general-relativity'],
    mathLevel:    2,
    renderer:     'canvas2d',
  },

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  init(_canvas, _params): GWState {
    return makeInitialState()
  },

  tick(state, dt, params): GWState {
    const chirpMass = params.chirpMass as number
    const speed     = params.speed     as number

    // ── Post-merger reset ─────────────────────────────────────────────────────
    if (state.merged) {
      const flashT = state.mergeFlashT + dt
      if (flashT > 1.5) {
        return makeInitialState()
      }
      return { ...state, mergeFlashT: flashT }
    }

    // ── Sub-step integration (8 steps for stability) ──────────────────────────
    const N        = 8
    const dt_sub   = dt / N
    let r          = state.r
    let phi        = state.phi
    let t          = state.t

    for (let i = 0; i < N; i++) {
      const omega = Math.sqrt(1 / (r * r * r))
      const drdt  = -chirpMass * 8 / (15 * Math.pow(r, 3))
      phi += omega * dt_sub * speed
      r   += drdt  * dt_sub * speed
      if (r < 0.15) { r = 0.15; break }
    }
    t += dt * speed

    // ── Detect merger ─────────────────────────────────────────────────────────
    const merged = r < 0.18
    if (merged) {
      return { ...state, r, phi, t, merged: true, mergeFlashT: 0 }
    }

    // ── GW strain ─────────────────────────────────────────────────────────────
    const h = (chirpMass * chirpMass / r) * Math.cos(2 * phi)
    const strain = state.strain.concat(h)
    if (strain.length > 300) strain.splice(0, strain.length - 300)

    // ── Emit wave rings ───────────────────────────────────────────────────────
    const omega_cur = Math.sqrt(1 / (r * r * r))
    const ringInterval = Math.PI * 0.3
    const rings: Ring[] = state.rings.map(ring => ({
      ...ring,
      r: ring.r + speed * dt * (0.8 + r),
    })).filter(ring => ring.r < 40)  // maxRingR = 40 (world units, scaled in render)

    // Check if we should emit a new ring
    const prevPhiMod = state.phi % ringInterval
    const nextPhiMod = phi       % ringInterval
    // Crossed a boundary (or wrapped)
    if (nextPhiMod < prevPhiMod || (phi - state.phi) * speed > ringInterval) {
      rings.push({
        r:    0,
        amp:  Math.min(3, chirpMass * chirpMass / r),
        born: t,
      })
    }

    // Alternative simpler trigger: every ~omega*dt >= ringInterval fraction
    void omega_cur  // used above via omega_cur for clarity — suppress lint warning

    return { ...state, r, phi, t, rings, strain, merged: false }
  },

  render(state, canvas, params) {
    const el     = canvas as HTMLCanvasElement
    const ctx    = el.getContext('2d')
    if (!ctx) return

    const W     = el.width
    const H     = el.height
    const chirpMass  = params.chirpMass as number
    const showWave   = params.waveform  as boolean

    // Layout
    const waveH  = showWave ? H * 0.18 : 0
    const cx     = W / 2
    const cy     = (H - waveH) * 0.52
    const scale  = Math.min(W, H - waveH) * 0.11

    // Background
    ctx.fillStyle = '#080808'
    ctx.fillRect(0, 0, W, H)

    // ── Merger flash ──────────────────────────────────────────────────────────
    if (state.mergeFlashT >= 0) {
      const flashAlpha = Math.max(0, 1 - state.mergeFlashT / 0.6) * 0.85
      ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`
      ctx.fillRect(0, 0, W, H)
      return
    }

    const r   = state.r
    const phi = state.phi
    const maxRingR = 40  // world units

    // ── Wave rings ────────────────────────────────────────────────────────────
    ctx.save()
    const time = state.t
    for (const ring of state.rings) {
      const frac    = ring.r / maxRingR
      const opacity = Math.max(0, (1 - frac) * 0.5 * Math.min(1, ring.amp))
      if (opacity < 0.005) continue

      const radius_px = ring.r * scale

      // Copper → dark-ocean gradient by distance
      const t_col  = Math.min(1, frac * 2)
      const rr     = Math.round(200 * (1 - t_col) + 10  * t_col)
      const gg     = Math.round(149 * (1 - t_col) + 26  * t_col)
      const bb     = Math.round(90  * (1 - t_col) + 46  * t_col)

      ctx.beginPath()
      ctx.arc(cx, cy, radius_px, 0, Math.PI * 2)
      ctx.setLineDash([8, 6])
      ctx.lineDashOffset = -(time * 40 + ring.born * 10) % 14
      ctx.strokeStyle    = `rgba(${rr},${gg},${bb},${opacity})`
      ctx.lineWidth      = Math.max(0.5, 1.5 * (1 - frac))
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()

    // ── Orbital path ─────────────────────────────────────────────────────────
    const orbitR_px = (r / 2) * scale
    ctx.beginPath()
    ctx.arc(cx, cy, orbitR_px, 0, Math.PI * 2)
    ctx.setLineDash([4, 8])
    ctx.strokeStyle = 'rgba(240,237,232,0.12)'
    ctx.lineWidth   = 0.8
    ctx.stroke()
    ctx.setLineDash([])

    // ── Two bodies ────────────────────────────────────────────────────────────
    const x1_px = cx + (r / 2) * Math.cos(phi)      * scale
    const y1_px = cy + (r / 2) * Math.sin(phi)      * scale
    const x2_px = cx - (r / 2) * Math.cos(phi)      * scale
    const y2_px = cy - (r / 2) * Math.sin(phi)      * scale

    // Body 1 — copper
    ctx.save()
    ctx.shadowBlur  = 12
    ctx.shadowColor = '#c8955a'
    ctx.beginPath()
    ctx.arc(x1_px, y1_px, 7, 0, Math.PI * 2)
    ctx.fillStyle   = '#c8955a'
    ctx.fill()
    ctx.restore()

    // Body 2 — blue
    ctx.save()
    ctx.shadowBlur  = 12
    ctx.shadowColor = '#60a5fa'
    ctx.beginPath()
    ctx.arc(x2_px, y2_px, 5, 0, Math.PI * 2)
    ctx.fillStyle   = '#60a5fa'
    ctx.fill()
    ctx.restore()

    // ── Waveform strip ────────────────────────────────────────────────────────
    if (showWave && state.strain.length > 1) {
      const stripY  = H - waveH
      const stripH  = waveH

      // Background strip
      ctx.fillStyle = 'rgba(12,12,20,0.7)'
      ctx.fillRect(0, stripY, W, stripH)

      // Separator line
      ctx.strokeStyle = 'rgba(200,149,90,0.25)'
      ctx.lineWidth   = 0.5
      ctx.beginPath()
      ctx.moveTo(0, stripY)
      ctx.lineTo(W, stripY)
      ctx.stroke()

      // Find max absolute strain for scaling
      let maxAbs = 0
      for (const v of state.strain) {
        const a = Math.abs(v)
        if (a > maxAbs) maxAbs = a
      }
      if (maxAbs < 1e-9) maxAbs = 1e-9

      const midY   = stripY + stripH / 2
      const scaleY = (stripH * 0.42) / maxAbs
      const nPts   = state.strain.length
      const dx     = W / (nPts - 1)

      ctx.beginPath()
      for (let i = 0; i < nPts; i++) {
        const sx = i * dx
        const sy = midY - state.strain[i] * scaleY
        if (i === 0) ctx.moveTo(sx, sy)
        else         ctx.lineTo(sx, sy)
      }
      ctx.strokeStyle = '#c8955a'
      ctx.lineWidth   = 1.2
      ctx.stroke()

      // Label
      ctx.font      = '9px monospace'
      ctx.fillStyle = 'rgba(200,149,90,0.55)'
      ctx.fillText('h(t)', 8, stripY + 14)

      // Chirp mass info
      ctx.fillStyle = 'rgba(240,237,232,0.20)'
      ctx.fillText(`ℳ = ${chirpMass.toFixed(1)}`, 8, stripY + stripH - 6)
    }
  },

  // ── Controls ─────────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'slider',
        id:      'chirpMass',
        label:   '啁啾质量',
        labelEn: 'Chirp mass',
        min:     0.3,
        max:     3,
        step:    0.1,
        default: 1,
      },
      {
        type:    'slider',
        id:      'speed',
        label:   '速度',
        labelEn: 'Speed',
        min:     0.5,
        max:     5,
        step:    0.5,
        default: 1,
      },
      {
        type:    'toggle',
        id:      'waveform',
        label:   '显示波形',
        labelEn: 'Show waveform',
        default: true,
      },
    ]
  },

  destroy() {},
}

export default GravitationalWaves

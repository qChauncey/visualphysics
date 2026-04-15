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
  r:           number        // orbital separation (normalised units)
  phi:         number        // orbital phase (radians)
  t:           number        // simulation time
  rings:       Ring[]        // expanding wave rings
  strain:      number[]      // last 300 strain values for waveform display
  merged:      boolean
  mergeFlashT: number        // seconds since merger (for flash decay); -1 = not merging
  tiltX:       number        // view elevation (0=top, π/3=oblique)
  azimuth:     number        // view rotation
  prevMouseX:  number
  prevMouseY:  number
}

// ── Module-level audio (outside immutable state) ───────────────────────────────

let _audioCtx: AudioContext | null = null
let _osc:      OscillatorNode | null = null
let _gain:     GainNode | null = null

function ensureAudio(): boolean {
  if (_audioCtx) return true
  try {
    _audioCtx = new AudioContext()
    _osc      = _audioCtx.createOscillator()
    _gain     = _audioCtx.createGain()
    _osc.type = 'sine'
    _gain.gain.setValueAtTime(0, _audioCtx.currentTime)
    _osc.connect(_gain)
    _gain.connect(_audioCtx.destination)
    _osc.start()
    return true
  } catch {
    return false
  }
}

function setAudio(r: number, chirpMass: number, enabled: boolean): void {
  if (!enabled) {
    if (_gain && _audioCtx) _gain.gain.setTargetAtTime(0, _audioCtx.currentTime, 0.08)
    return
  }
  if (!ensureAudio()) return
  // GW frequency: f_gw = 2ω / 2π, scaled to audible 40–900 Hz
  const omega = Math.sqrt(1 / Math.pow(Math.max(r, 0.15), 3))
  const refOmega = Math.sqrt(1 / 64) // omega at r=4 (start)
  const freq  = Math.max(40, Math.min(900, 40 * (omega / refOmega)))
  _osc!.frequency.setTargetAtTime(freq, _audioCtx!.currentTime, 0.04)
  // Amplitude grows as binary inspirals
  const amp = Math.min(0.28, 0.04 + chirpMass * chirpMass * 0.08 / Math.max(r, 0.2))
  _gain!.gain.setTargetAtTime(amp, _audioCtx!.currentTime, 0.08)
}

function silenceAudio(): void {
  if (_gain && _audioCtx) _gain.gain.setTargetAtTime(0, _audioCtx.currentTime, 0.1)
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
    tiltX:       0.55,        // default: slightly oblique view
    azimuth:     0,
    prevMouseX:  -1,
    prevMouseY:  -1,
  }
}

// ── 3D projection helpers ──────────────────────────────────────────────────────

/**
 * Project a world-space point (wx, wy_orbital=0, wz) through tilt + azimuth
 * onto canvas coords, centred at (cx, cy) with given scale.
 * tiltX: 0=top view, π/2=side view
 * azimuth: rotation around vertical
 */
function project3D(
  wx: number, wz: number,
  cx: number, cy: number,
  scale: number,
  tiltX: number,
  azimuth: number,
): [number, number] {
  // rotate around Y axis by azimuth
  const rx = wx * Math.cos(azimuth) - wz * Math.sin(azimuth)
  const rz = wx * Math.sin(azimuth) + wz * Math.cos(azimuth)
  // apply tilt: compress z into y (oblique projection)
  const sx = cx + rx * scale
  const sy = cy + rz * scale * Math.cos(tiltX)
  return [sx, sy]
}

// ── Spacetime grid drawing ─────────────────────────────────────────────────────

function drawSpacetimeGrid(
  ctx:       CanvasRenderingContext2D,
  W:         number,
  H:         number,
  cx:        number,
  cy:        number,
  r:         number,   // orbital separation (world units)
  chirpMass: number,
  scale:     number,
  tiltX:     number,
  azimuth:   number,
): void {
  // Grid extends ±gridR world units around centre
  const gridR   = 6
  const N       = 28   // grid lines per axis (dense)
  const SEGS    = 60   // segments per grid line
  const strength = Math.min(1.4, chirpMass * chirpMass * 0.18 / (r * r + 0.3))

  // Warp world coords based on gravitational potential of the two bodies
  function displace(wx: number, wz: number): [number, number] {
    const dx1 = wx, dz1 = wz              // body pair at centre
    const d1 = Math.sqrt(dx1*dx1 + dz1*dz1) + 0.5
    const pull = strength / (d1 * d1) * 0.6
    const wx2 = wx + pull * dx1 / d1
    const wz2 = wz + pull * dz1 / d1
    return project3D(wx2, wz2, cx, cy, scale, tiltX, azimuth)
  }

  ctx.save()
  ctx.strokeStyle = 'rgba(60, 120, 200, 0.38)'
  ctx.lineWidth   = 0.8

  // Horizontal lines (constant wz)
  for (let i = 0; i <= N; i++) {
    const wz = -gridR + (i / N) * gridR * 2
    ctx.beginPath()
    for (let j = 0; j <= SEGS; j++) {
      const wx = -gridR + (j / SEGS) * gridR * 2
      const [px, py] = displace(wx, wz)
      j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  // Vertical lines (constant wx)
  for (let i = 0; i <= N; i++) {
    const wx = -gridR + (i / N) * gridR * 2
    ctx.beginPath()
    for (let j = 0; j <= SEGS; j++) {
      const wz = -gridR + (j / SEGS) * gridR * 2
      const [px, py] = displace(wx, wz)
      j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  ctx.restore()
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
    const audio     = (params.audio    as boolean) ?? false

    // ── Camera drag ───────────────────────────────────────────────────────────
    let { tiltX, azimuth, prevMouseX, prevMouseY } = state
    const mouseX = (params._mouseX as number) ?? -1
    const mouseY = (params._mouseY as number) ?? -1
    if (params._dragging && mouseX >= 0 && mouseY >= 0 && prevMouseX >= 0 && prevMouseY >= 0) {
      azimuth -= (mouseX - prevMouseX) * 0.008
      tiltX    = Math.max(0, Math.min(Math.PI / 2.2, tiltX - (mouseY - prevMouseY) * 0.006))
    }
    prevMouseX = mouseX >= 0 ? mouseX : -1
    prevMouseY = mouseY >= 0 ? mouseY : -1

    // ── Post-merger reset ─────────────────────────────────────────────────────
    if (state.merged) {
      silenceAudio()
      const flashT = state.mergeFlashT + dt
      if (flashT > 1.5) return { ...makeInitialState(), tiltX, azimuth }
      return { ...state, mergeFlashT: flashT, tiltX, azimuth, prevMouseX, prevMouseY }
    }

    // ── Sub-step integration (8 steps for stability) ──────────────────────────
    const N = 8, dt_sub = dt / N
    let r = state.r, phi = state.phi, t = state.t

    for (let i = 0; i < N; i++) {
      const omega = Math.sqrt(1 / (r * r * r))
      const drdt  = -chirpMass * 8 / (15 * Math.pow(r, 3))
      phi += omega * dt_sub * speed
      r   += drdt  * dt_sub * speed
      if (r < 0.15) { r = 0.15; break }
    }
    t += dt * speed

    // ── Detect merger ─────────────────────────────────────────────────────────
    if (r < 0.18) {
      setAudio(r, chirpMass, false)
      return { ...state, r, phi, t, merged: true, mergeFlashT: 0 }
    }

    // ── Audio chirp ───────────────────────────────────────────────────────────
    setAudio(r, chirpMass, audio)

    // ── GW strain ─────────────────────────────────────────────────────────────
    const h = (chirpMass * chirpMass / r) * Math.cos(2 * phi)
    const strain = state.strain.concat(h)
    if (strain.length > 300) strain.splice(0, strain.length - 300)

    // ── Emit wave rings ───────────────────────────────────────────────────────
    const ringInterval = Math.PI * 0.25   // denser rings
    const rings: Ring[] = state.rings.map(ring => ({
      ...ring,
      r: ring.r + speed * dt * (0.9 + r),
    })).filter(ring => ring.r < 40)

    const prevPhiMod = state.phi % ringInterval
    const nextPhiMod = phi       % ringInterval
    if (nextPhiMod < prevPhiMod || (phi - state.phi) * speed > ringInterval) {
      rings.push({ r: 0, amp: Math.min(4, chirpMass * chirpMass / r), born: t })
    }

    return { ...state, r, phi, t, rings, strain, merged: false, tiltX, azimuth, prevMouseX, prevMouseY }
  },

  render(state, canvas, params) {
    const el  = canvas as HTMLCanvasElement
    const ctx = el.getContext('2d')
    if (!ctx) return

    const W          = el.width
    const H          = el.height
    const chirpMass  = params.chirpMass as number
    const showWave   = params.waveform  as boolean
    const showGrid   = (params.showGrid as boolean) ?? true
    const zoom       = (params._zoom    as number)  ?? 1
    const tiltX      = state.tiltX
    const azimuth    = state.azimuth

    const waveH = showWave ? H * 0.18 : 0
    const mainH = H - waveH
    const cx    = W / 2
    const cy    = mainH * 0.48
    const scale = Math.min(W, mainH) * 0.11 * zoom

    // Background
    ctx.fillStyle = '#060810'
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

    // World positions of the two bodies (orbital plane = xz plane)
    const w1x = (r / 2) * Math.cos(phi), w1z = (r / 2) * Math.sin(phi)
    const w2x = -(r / 2) * Math.cos(phi), w2z = -(r / 2) * Math.sin(phi)

    const [x1, y1] = project3D(w1x, w1z, cx, cy, scale, tiltX, azimuth)
    const [x2, y2] = project3D(w2x, w2z, cx, cy, scale, tiltX, azimuth)

    // ── Spacetime grid ────────────────────────────────────────────────────────
    if (showGrid) {
      drawSpacetimeGrid(ctx, W, mainH, cx, cy, r, chirpMass, scale, tiltX, azimuth)
    }

    // ── Wave rings (ellipses under tilt) ──────────────────────────────────────
    ctx.save()
    const time = state.t
    for (const ring of state.rings) {
      const frac    = ring.r / 40
      const opacity = Math.max(0, (1 - frac) * 0.80 * Math.min(1.5, ring.amp))
      if (opacity < 0.005) continue

      const t_col = Math.min(1, frac * 2)
      const rr    = Math.round(220 * (1 - t_col) + 10  * t_col)
      const gg    = Math.round(160 * (1 - t_col) + 30  * t_col)
      const bb    = Math.round(90  * (1 - t_col) + 60  * t_col)
      const rPx   = ring.r * scale

      // Draw ellipse approximating the ring under tilt
      ctx.beginPath()
      ctx.ellipse(cx, cy, rPx, rPx * Math.abs(Math.cos(tiltX)), azimuth, 0, Math.PI * 2)
      ctx.setLineDash([10, 6])
      ctx.lineDashOffset = -(time * 50 + ring.born * 12) % 16
      ctx.strokeStyle    = `rgba(${rr},${gg},${bb},${opacity})`
      ctx.lineWidth      = Math.max(0.8, 2.5 * (1 - frac))
      ctx.stroke()
    }
    ctx.setLineDash([])
    ctx.restore()

    // ── Orbital path ─────────────────────────────────────────────────────────
    const orbitR = (r / 2) * scale
    ctx.beginPath()
    ctx.ellipse(cx, cy, orbitR, orbitR * Math.abs(Math.cos(tiltX)), azimuth, 0, Math.PI * 2)
    ctx.setLineDash([4, 8])
    ctx.strokeStyle = 'rgba(240,237,232,0.14)'
    ctx.lineWidth   = 0.8
    ctx.stroke()
    ctx.setLineDash([])

    // ── Bodies ────────────────────────────────────────────────────────────────
    ctx.save()
    ctx.shadowBlur  = 20; ctx.shadowColor = '#c8955a'
    ctx.beginPath(); ctx.arc(x1, y1, 8, 0, Math.PI * 2)
    ctx.fillStyle   = '#c8955a'; ctx.fill()
    ctx.restore()

    ctx.save()
    ctx.shadowBlur  = 20; ctx.shadowColor = '#60a5fa'
    ctx.beginPath(); ctx.arc(x2, y2, 6, 0, Math.PI * 2)
    ctx.fillStyle   = '#60a5fa'; ctx.fill()
    ctx.restore()

    // ── Waveform strip ────────────────────────────────────────────────────────
    if (showWave && state.strain.length > 1) {
      const stripY = mainH, stripH = waveH
      ctx.fillStyle = 'rgba(10,12,22,0.75)'
      ctx.fillRect(0, stripY, W, stripH)
      ctx.strokeStyle = 'rgba(200,149,90,0.30)'; ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.moveTo(0, stripY); ctx.lineTo(W, stripY); ctx.stroke()

      let maxAbs = 0
      for (const v of state.strain) { const a = Math.abs(v); if (a > maxAbs) maxAbs = a }
      if (maxAbs < 1e-9) maxAbs = 1e-9

      const midY = stripY + stripH / 2, scaleY = (stripH * 0.42) / maxAbs
      const nPts = state.strain.length, dx = W / (nPts - 1)
      ctx.beginPath()
      for (let i = 0; i < nPts; i++) {
        const sx = i * dx, sy = midY - state.strain[i] * scaleY
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
      }
      ctx.strokeStyle = '#c8955a'; ctx.lineWidth = 1.4; ctx.stroke()

      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(200,149,90,0.60)'; ctx.fillText('h(t)', 8, stripY + 14)
      ctx.fillStyle = 'rgba(240,237,232,0.22)'; ctx.fillText(`ℳ = ${chirpMass.toFixed(1)}`, 8, stripY + stripH - 6)
    }
  },

  // ── Controls ─────────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'slider', id: 'chirpMass',
        label:   '啁啾质量', labelEn: 'Chirp mass',
        min: 0.3, max: 3, step: 0.1, default: 1,
      },
      {
        type:    'slider', id: 'speed',
        label:   '速度', labelEn: 'Speed',
        min: 0.5, max: 5, step: 0.5, default: 1,
      },
      {
        type:    'toggle', id: 'waveform',
        label:   '显示波形', labelEn: 'Show waveform',
        default: true,
      },
      {
        type:    'toggle', id: 'showGrid',
        label:   '时空网格', labelEn: 'Spacetime grid',
        default: true,
      },
      {
        type:    'toggle', id: 'audio',
        label:   '引力波声音 🔊', labelEn: 'Audio chirp 🔊',
        default: false,
      },
    ]
  },

  destroy() {
    silenceAudio()
    if (_osc)      { try { _osc.stop()       } catch { /* ok */ } }
    if (_audioCtx) { try { _audioCtx.close() } catch { /* ok */ } }
    _audioCtx = null; _osc = null; _gain = null
  },
}

export default GravitationalWaves

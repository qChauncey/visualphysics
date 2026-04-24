// 2D Ising Model — Statistical Mechanics / Phase Transition
// Metropolis-Hastings Monte Carlo on a 2D spin lattice.
// Two alternating Int8Arrays avoid per-frame allocation (double-buffer pattern).
// Live magnetisation history chart shows the order→disorder transition at Tc.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

const TC = 2.269          // exact Onsager critical temperature (J/k units)
const M_HIST = 300        // magnetisation history samples

// Design colours
const UP_R = 200, UP_G = 149, UP_B = 90    // copper — spin +1
const DN_R =  10, DN_G =  26, DN_B = 46    // deep navy — spin -1

// ── State ─────────────────────────────────────────────────────────────────────

type IsingState = {
  grid:      Int8Array   // current frame
  next:      Int8Array   // write buffer (swapped each tick)
  N:         number
  imageData: ImageData | null
  mHist:     Float32Array   // circular buffer of |M|
  mHead:     number
  mFill:     number
  eHist:     Float32Array   // circular buffer of energy per spin
  eHead:     number
}

function makeState(N: number): IsingState {
  const grid = new Int8Array(N * N)
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.5 ? 1 : -1
  return {
    grid,
    next:      new Int8Array(N * N),
    N,
    imageData: null,
    mHist:     new Float32Array(M_HIST),
    mHead:     0,
    mFill:     0,
    eHist:     new Float32Array(M_HIST),
    eHead:     0,
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

const IsingModelModule: PhysicsModule<IsingState> = {
  id: 'ising-model',

  metadata: {
    title:       '伊辛模型',
    titleEn:     'Ising Model',
    description:  '二维铁磁自旋点阵的相变模拟。温度穿越临界点时，自发对称破缺和长程序出现。',
    descriptionEn: 'Phase transition in a 2D ferromagnetic spin lattice. Spontaneous symmetry breaking and long-range order emerge at the critical temperature Tc ≈ 2.269 J/k.',
    theory:    ['thermodynamics'],
    mathLevel: 2,
    renderer:  'canvas2d',
  },

  init(_canvas, params): IsingState {
    return makeState(parseInt(params.gridSize as string, 10) || 64)
  },

  tick(state, _dt, params): IsingState {
    const targetN = parseInt(params.gridSize as string, 10) || 64

    if ((params.reset as boolean) === true || targetN !== state.N) {
      return makeState(targetN)
    }

    const { N } = state
    const T     = Math.max(0.01, params.temp as number)
    const speed = Math.max(1, params.speed as number)
    const steps = Math.round(speed * N * N / 4)
    const invT  = 1 / T

    // Copy current → next
    state.next.set(state.grid)
    const g = state.next

    // Metropolis-Hastings — checkerboard would be better but random is simpler
    for (let k = 0; k < steps; k++) {
      const idx = (Math.random() * N * N) | 0
      const row = (idx / N) | 0
      const col = idx % N
      const s   = g[idx]
      const nb  = g[((row-1+N)%N)*N + col]
               + g[((row+1)%N)*N   + col]
               + g[row*N + (col-1+N)%N]
               + g[row*N + (col+1)%N]
      const dE  = 2 * s * nb
      if (dE <= 0 || Math.random() < Math.exp(-dE * invT)) {
        g[idx] = -s as (1 | -1)
      }
    }

    // Swap buffers
    const newGrid = state.next
    const newNext = state.grid
    newNext.set(newGrid)   // prime next buffer with current state

    // Compute |M| and E/spin
    let sum = 0, E = 0
    for (let i = 0; i < N*N; i++) sum += g[i]
    // Energy: -J Σ nearest-neighbour pairs (sample from grid)
    for (let row = 0; row < N; row++) {
      for (let col = 0; col < N; col++) {
        const s = g[row*N+col]
        E -= s * g[((row+1)%N)*N+col]
        E -= s * g[row*N+(col+1)%N]
      }
    }
    const M    = Math.abs(sum / (N*N))
    const Espin = E / (N*N)

    // Push to circular histories (mutate in place — render-side cache)
    state.mHist[state.mHead] = M
    state.eHist[state.eHead] = Espin
    const mHead = (state.mHead + 1) % M_HIST
    const eHead = mHead
    const mFill = Math.min(state.mFill + 1, M_HIST)

    return {
      ...state,
      grid:      newGrid,
      next:      newNext,
      imageData: state.imageData,
      mHead,
      eHead,
      mFill,
    }
  },

  render(state, canvas, params): void {
    const cvs = canvas as HTMLCanvasElement
    const ctx  = cvs.getContext('2d')
    if (!ctx) return

    const { grid, N, mHist, mHead, mFill } = state
    const w = cvs.width, h = cvs.height

    // ── Spin grid ─────────────────────────────────────────────────────────────
    let img = state.imageData
    if (!img || img.width !== N || img.height !== N) {
      img = ctx.createImageData(N, N)
      ;(state as IsingState).imageData = img
    }
    const d = img.data
    for (let i = 0; i < N*N; i++) {
      const b = i * 4
      if (grid[i] === 1) {
        d[b]=UP_R; d[b+1]=UP_G; d[b+2]=UP_B; d[b+3]=255
      } else {
        d[b]=DN_R; d[b+1]=DN_G; d[b+2]=DN_B; d[b+3]=255
      }
    }

    // Draw scaled spin grid (top 75% of canvas)
    const gridH = Math.round(h * 0.72)
    ctx.imageSmoothingEnabled = false
    const tmp = document.createElement('canvas')
    tmp.width = N; tmp.height = N
    const tCtx = tmp.getContext('2d')!
    tCtx.putImageData(img, 0, 0)
    ctx.drawImage(tmp, 0, 0, w, gridH)

    // ── Tc marker line on grid ────────────────────────────────────────────────
    const T = params.temp as number
    // Position Tc indicator: a subtle horizontal strip if T ≈ Tc
    const tRatio = T / TC
    ctx.save()
    // Draw a subtle dashed line at the Tc mark on the *temperature axis*
    // (shown in the chart area below — see there)
    ctx.restore()

    // ── Magnetisation history chart (bottom 25%) ──────────────────────────────
    const chartY = gridH + 4
    const chartH = h - chartY - 2
    const chartW = w

    // Background
    ctx.fillStyle = 'rgba(4,4,12,0.85)'
    ctx.fillRect(0, chartY, chartW, chartH)
    ctx.strokeStyle = 'rgba(240,237,232,0.07)'
    ctx.lineWidth   = 1
    ctx.strokeRect(0.5, chartY + 0.5, chartW - 1, chartH - 1)

    // Gridlines at M = 0.5, 1.0
    for (const mv of [0.5, 1.0]) {
      const y = chartY + chartH - mv * (chartH - 4) - 2
      ctx.strokeStyle = 'rgba(240,237,232,0.07)'
      ctx.lineWidth   = 1
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke()
      ctx.font      = '9px monospace'
      ctx.fillStyle = 'rgba(240,237,232,0.25)'
      ctx.textAlign = 'left'
      ctx.fillText(mv.toFixed(1), 3, y - 2)
    }

    // |M| curve
    if (mFill > 1) {
      ctx.beginPath()
      const oldest = mFill === M_HIST ? mHead : 0
      for (let i = 0; i < mFill; i++) {
        const idx = (oldest + i) % M_HIST
        const x = (i / (M_HIST - 1)) * chartW
        const y = chartY + chartH - mHist[idx] * (chartH - 4) - 2
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.strokeStyle = '#c8955a'
      ctx.lineWidth   = 1.5
      ctx.stroke()
    }

    // ── Overlay text ──────────────────────────────────────────────────────────
    const pad = 8
    ctx.textBaseline = 'top'

    // T / Tc ratio (top-right of grid)
    const line1 = `T = ${tRatio.toFixed(2)} Tc`
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.fillStyle = tRatio < 1 ? '#c8955a' : tRatio < 1.15 ? '#f0d090' : 'rgba(240,237,232,0.55)'
    ctx.fillText(line1, w - pad, pad)

    // |M| current (below T label)
    const mNow = mFill > 0 ? mHist[(mHead - 1 + M_HIST) % M_HIST] : 0
    ctx.font      = '10px monospace'
    ctx.fillStyle = '#c8955a'
    ctx.fillText(`|M| = ${mNow.toFixed(3)}`, w - pad, pad + 16)

    // Phase label
    ctx.font = '9px monospace'
    ctx.fillStyle = 'rgba(240,237,232,0.28)'
    ctx.fillText(tRatio < 0.95 ? (params._lang === 'en' ? 'ordered' : '有序相') :
                 tRatio > 1.10 ? (params._lang === 'en' ? 'disordered' : '无序相') :
                 (params._lang === 'en' ? '≈ critical' : '≈ 临界点'),
                 w - pad, pad + 30)

    // Tc arrow on the chart x-axis
    // The chart shows time, not temperature — so we mark Tc differently:
    // draw a vertical Tc marker line on the grid at the y-position
    // corresponding to the critical temperature in the spin pattern.
    // Instead, draw a label on the chart
    ctx.textAlign    = 'left'
    ctx.textBaseline = 'bottom'
    ctx.font         = '9px monospace'
    ctx.fillStyle    = 'rgba(240,237,232,0.22)'
    ctx.fillText('|M|', 3, chartY + chartH - 2)

    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider', id: 'temp', label: '温度 T', labelEn: 'Temperature T',
        min: 0.5, max: 5, step: 0.05, default: 2.27,
      },
      {
        type: 'slider', id: 'speed', label: '速度', labelEn: 'Speed',
        min: 1, max: 20, step: 1, default: 5,
      },
      {
        type: 'select', id: 'gridSize', label: '网格大小', labelEn: 'Grid size',
        options: [
          { value: '32', label: '32×32',   labelEn: '32×32'   },
          { value: '64', label: '64×64',   labelEn: '64×64'   },
          { value: '96', label: '96×96',   labelEn: '96×96'   },
          { value: '128', label: '128×128', labelEn: '128×128' },
        ],
        default: '64',
      },
      { type: 'button', id: 'reset', label: '随机重置', labelEn: 'Randomise' },
    ]
  },

  destroy() {},
}

export default IsingModelModule

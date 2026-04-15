// ─────────────────────────────────────────────
//  Module: 2D Ising Model (Statistical Mechanics)
//  Renderer: Canvas 2D
// ─────────────────────────────────────────────

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'

type IsingState = {
  grid: Int8Array      // N*N, values +1 or -1, row-major
  N: number
  imageData: ImageData | null  // reused pixel buffer
}

const TC = 2.269  // Critical temperature (J/k units)

// Copper colour for spin +1: (200, 149, 90)
const SPIN_UP_R = 200
const SPIN_UP_G = 149
const SPIN_UP_B = 90

// Dark blue for spin -1: (10, 26, 46)
const SPIN_DN_R = 10
const SPIN_DN_G = 26
const SPIN_DN_B = 46

function makeGrid(N: number): Int8Array {
  const grid = new Int8Array(N * N)
  for (let i = 0; i < grid.length; i++) {
    grid[i] = Math.random() < 0.5 ? 1 : -1
  }
  return grid
}

const IsingModelModule: PhysicsModule<IsingState> = {
  id: 'ising-model',
  metadata: {
    title: '伊辛模型',
    titleEn: 'Ising Model',
    description:
      '二维铁磁自旋点阵的相变模拟。温度穿越临界点时，自发对称破缺和长程序出现。',
    descriptionEn:
      'Phase transition in a 2D ferromagnetic spin lattice. Spontaneous symmetry breaking and long-range order emerge at the critical temperature Tc ≈ 2.269 J/k.',
    theory: ['thermodynamics'],
    mathLevel: 2,
    renderer: 'canvas2d',
  },

  init(_canvas, params): IsingState {
    const N = parseInt(params.gridSize as string, 10) || 64
    return {
      grid: makeGrid(N),
      N,
      imageData: null,
    }
  },

  tick(state, _dt, params): IsingState {
    // Handle reset
    if (params.reset === true) {
      const N = parseInt(params.gridSize as string, 10) || 64
      return { grid: makeGrid(N), N, imageData: null }
    }

    const targetN = parseInt(params.gridSize as string, 10) || 64
    let { grid, N, imageData } = state

    // Reinitialise if grid size changed
    if (targetN !== N) {
      N = targetN
      grid = makeGrid(N)
      imageData = null
    }

    const T = params.temp as number
    const speed = params.speed as number
    const stepsPerFrame = Math.max(1, Math.round(speed * N * N / 4))

    // Metropolis-Hastings spin flips
    const newGrid = new Int8Array(grid)
    const invT = T > 0 ? 1 / T : 1e9

    for (let k = 0; k < stepsPerFrame; k++) {
      // Pick a random site
      const idx = Math.floor(Math.random() * N * N)
      const row = Math.floor(idx / N)
      const col = idx % N

      const s = newGrid[idx]

      // Sum of 4 neighbours with periodic boundary
      const top    = newGrid[((row - 1 + N) % N) * N + col]
      const bottom = newGrid[((row + 1)     % N) * N + col]
      const left   = newGrid[row * N + (col - 1 + N) % N]
      const right  = newGrid[row * N + (col + 1)     % N]
      const nb = top + bottom + left + right

      const dE = 2 * s * nb  // J = 1

      if (dE <= 0) {
        newGrid[idx] = -s as (1 | -1)
      } else {
        // Flip with probability exp(-dE / T)
        if (Math.random() < Math.exp(-dE * invT)) {
          newGrid[idx] = -s as (1 | -1)
        }
      }
    }

    return { grid: newGrid, N, imageData }
  },

  render(state, canvas, params): void {
    const cvs = canvas as HTMLCanvasElement
    const ctx = cvs.getContext('2d')
    if (!ctx) return

    const { grid, N } = state
    const w = cvs.width
    const h = cvs.height

    // Create or reuse the ImageData buffer (N×N pixels)
    let imageData = state.imageData
    if (!imageData || imageData.width !== N || imageData.height !== N) {
      imageData = ctx.createImageData(N, N)
      // Mutate state directly — imageData is a render-side cache, not simulation state
      ;(state as IsingState).imageData = imageData
    }

    const data = imageData.data

    // Write pixel colours
    for (let i = 0; i < N * N; i++) {
      const base = i * 4
      if (grid[i] === 1) {
        data[base]     = SPIN_UP_R
        data[base + 1] = SPIN_UP_G
        data[base + 2] = SPIN_UP_B
        data[base + 3] = 255
      } else {
        data[base]     = SPIN_DN_R
        data[base + 1] = SPIN_DN_G
        data[base + 2] = SPIN_DN_B
        data[base + 3] = 255
      }
    }

    // Draw the N×N image scaled up to fill canvas
    ctx.imageSmoothingEnabled = false

    // Use an offscreen canvas to hold the raw pixel data, then drawImage scales it
    const offscreen = new OffscreenCanvas(N, N)
    const offCtx = offscreen.getContext('2d')
    if (offCtx) {
      offCtx.putImageData(imageData, 0, 0)
      ctx.drawImage(offscreen, 0, 0, w, h)
    } else {
      // Fallback: create a temporary canvas element
      const tmp = document.createElement('canvas')
      tmp.width = N
      tmp.height = N
      const tmpCtx = tmp.getContext('2d')
      if (tmpCtx) {
        tmpCtx.putImageData(imageData, 0, 0)
        ctx.drawImage(tmp, 0, 0, w, h)
      }
    }

    // Compute magnetisation M = |mean(grid)|
    let sum = 0
    for (let i = 0; i < grid.length; i++) sum += grid[i]
    const M = Math.abs(sum / (N * N))
    const T = params.temp as number
    const tRatio = (T / TC).toFixed(2)
    const mStr = M.toFixed(2)

    // Overlay text — top-right corner
    const pad = 8
    ctx.font = '11px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'

    // "T = X.XX Tc"
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    const line1 = `T = ${tRatio} Tc`
    const m1 = ctx.measureText(line1)
    ctx.fillRect(w - pad - m1.width - 4, pad - 2, m1.width + 8, 16)
    ctx.fillStyle = '#ffffff'
    ctx.fillText(line1, w - pad, pad)

    // "M = ±X.XX"
    ctx.font = '10px monospace'
    const line2 = `M = \u00b1${mStr}`
    const m2 = ctx.measureText(line2)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(w - pad - m2.width - 4, pad + 18 - 2, m2.width + 8, 15)
    ctx.fillStyle = '#c8955a'
    ctx.fillText(line2, w - pad, pad + 18)
  },

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'slider',
        id: 'temp',
        label: '温度 T',
        labelEn: 'Temperature T',
        min: 0.5,
        max: 5,
        step: 0.05,
        default: 2.27,
      },
      {
        type: 'slider',
        id: 'speed',
        label: '速度',
        labelEn: 'Speed',
        min: 1,
        max: 20,
        step: 1,
        default: 5,
      },
      {
        type: 'select',
        id: 'gridSize',
        label: '网格大小',
        labelEn: 'Grid size',
        options: [
          { value: '32', label: '32×32', labelEn: '32×32' },
          { value: '64', label: '64×64', labelEn: '64×64' },
          { value: '96', label: '96×96', labelEn: '96×96' },
        ],
        default: '64',
      },
      {
        type: 'button',
        id: 'reset',
        label: '随机重置',
        labelEn: 'Randomise',
      },
    ]
  },

  destroy() {},
}

export default IsingModelModule

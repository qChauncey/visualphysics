// String Worldsheet — Three.js parametric surface visualization
//
// Visualises the 2D worldsheet swept out by a vibrating string in spacetime.
// Open string: X^mu(sigma,tau) with sigma in [0,pi], Neumann boundary conditions.
// Closed string: X^mu(sigma,tau) with sigma in [0,2pi], periodic (tube topology).
//
// Mode expansion (transverse oscillations):
//   X(sigma,tau) = A * cos(n*sigma) * cos(n*tau)
//   Y(sigma,tau) = tau  (time direction)
//   Z(sigma,tau) = A * sin(n*sigma) * sin(n*tau)
//
// The worldsheet is a 2D surface embedded in 3D target space, coloured by tau
// (blue at past / bottom -> copper at future / top).

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────

const N_SIGMA = 60
const N_TAU   = 80
const TAU_MAX = 6           // worldsheet extent in tau direction
const R_CLOSED = 0.8        // base radius for closed string tube

const COL_PAST   = new THREE.Color(0x0a2a5a)  // deep blue (tau=0)
const COL_FUTURE = new THREE.Color(0xc8955a)  // copper    (tau=max)

// ── State ─────────────────────────────────────────────────────────────────

type WorldsheetState = {
  renderer:   THREE.WebGLRenderer
  scene:      THREE.Scene
  camera:     THREE.PerspectiveCamera
  surfaceMesh: THREE.Mesh
  wireMesh:   THREE.Mesh
  stringLine: THREE.Line
  posAttr:    THREE.BufferAttribute
  colAttr:    THREE.BufferAttribute
  nSigma:     number
  nTau:       number
  camAngle:   number
  time:       number
  lastType:   string
  lastMode:   number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Helpers ───────────────────────────────────────────────────────────────

/** Build geometry + attributes for the worldsheet surface */
function buildWorldsheetGeometry(
  nSigma: number,
  nTau: number,
): {
  geo: THREE.BufferGeometry
  posAttr: THREE.BufferAttribute
  colAttr: THREE.BufferAttribute
} {
  const vertCount = (nSigma + 1) * (nTau + 1)
  const positions = new Float32Array(vertCount * 3)
  const colors    = new Float32Array(vertCount * 3)

  const posAttr = new THREE.BufferAttribute(positions, 3)
  const colAttr = new THREE.BufferAttribute(colors, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  colAttr.setUsage(THREE.DynamicDrawUsage)

  // Build index buffer
  const indices: number[] = []
  const stride = nSigma + 1
  for (let jt = 0; jt < nTau; jt++) {
    for (let is = 0; is < nSigma; is++) {
      const a = jt * stride + is
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', posAttr)
  geo.setAttribute('color', colAttr)
  geo.setIndex(indices)

  return { geo, posAttr, colAttr }
}

/** Update vertex positions and colors for the current frame */
function updateSurface(
  posAttr: THREE.BufferAttribute,
  colAttr: THREE.BufferAttribute,
  nSigma: number,
  nTau: number,
  mode: number,
  amplitude: number,
  stringType: string,
  time: number,
) {
  const sigmaMax = stringType === 'closed' ? Math.PI * 2 : Math.PI
  const stride   = nSigma + 1
  const n        = mode
  const A        = amplitude

  for (let jt = 0; jt <= nTau; jt++) {
    const tFrac = jt / nTau                        // 0..1
    const tau   = tFrac * TAU_MAX                   // 0..TAU_MAX
    const yPos  = (tFrac - 0.5) * TAU_MAX           // centre vertically

    for (let is = 0; is <= nSigma; is++) {
      const sigma = (is / nSigma) * sigmaMax
      const idx   = jt * stride + is

      let x: number, z: number

      if (stringType === 'closed') {
        // Closed string: tube with oscillations
        const osc = A * Math.cos(n * sigma + n * (tau + time))
        x = (R_CLOSED + osc) * Math.cos(sigma)
        z = (R_CLOSED + osc) * Math.sin(sigma)
      } else {
        // Open string: standing wave
        x = A * Math.cos(n * sigma) * Math.cos(n * (tau + time))
        z = A * Math.sin(n * sigma) * Math.sin(n * (tau + time))
      }

      posAttr.setXYZ(idx, x, yPos, z)

      // Colour gradient: blue (past) -> copper (future)
      const c = COL_PAST.clone().lerp(COL_FUTURE, tFrac)
      colAttr.setXYZ(idx, c.r, c.g, c.b)
    }
  }

  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
}

/** Update the "current string" highlight line at the top edge (latest tau) */
function updateStringLine(
  line: THREE.Line,
  nSigma: number,
  mode: number,
  amplitude: number,
  stringType: string,
  time: number,
) {
  const geo      = line.geometry as THREE.BufferGeometry
  const posAttr  = geo.getAttribute('position') as THREE.BufferAttribute
  const sigmaMax = stringType === 'closed' ? Math.PI * 2 : Math.PI
  const n        = mode
  const A        = amplitude
  const tau      = TAU_MAX
  const yPos     = 0.5 * TAU_MAX  // top edge

  const count = stringType === 'closed' ? nSigma + 2 : nSigma + 1

  for (let is = 0; is < count; is++) {
    const sigma = (is / nSigma) * sigmaMax
    let x: number, z: number

    if (stringType === 'closed') {
      const osc = A * Math.cos(n * sigma + n * (tau + time))
      x = (R_CLOSED + osc) * Math.cos(sigma)
      z = (R_CLOSED + osc) * Math.sin(sigma)
    } else {
      x = A * Math.cos(n * sigma) * Math.cos(n * (tau + time))
      z = A * Math.sin(n * sigma) * Math.sin(n * (tau + time))
    }

    posAttr.setXYZ(is, x, yPos, z)
  }

  geo.setDrawRange(0, count)
  posAttr.needsUpdate = true
}

// ── Module ────────────────────────────────────────────────────────────────

const StringWorldsheet: PhysicsModule<WorldsheetState> = {
  id: 'string-worldsheet',

  metadata: {
    title:         '弦世界面',
    titleEn:       'String Worldsheet',
    description:   '弦在时空中扫过的二维世界面——弦理论的基本对象。不同振动模式对应不同粒子。',
    descriptionEn: 'The 2D worldsheet swept by a string through spacetime — the fundamental object in string theory. Different vibration modes correspond to different particles.',
    theory:        ['string-theory'],
    mathLevel:     3,
    renderer:      'threejs',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(canvas, params): WorldsheetState {
    const el = canvas as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x030610)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambient)

    const dirLight = new THREE.DirectionalLight(0xb0c8ff, 1.0)
    dirLight.position.set(5, 8, 6)
    scene.add(dirLight)

    // ── Surface mesh ────────────────────────────────────────────────────────

    const { geo, posAttr, colAttr } = buildWorldsheetGeometry(N_SIGMA, N_TAU)

    const surfaceMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side:         THREE.DoubleSide,
      roughness:    0.5,
      metalness:    0.2,
      transparent:  true,
      opacity:      0.75,
    })
    const surfaceMesh = new THREE.Mesh(geo, surfaceMat)
    scene.add(surfaceMesh)

    // ── Wireframe overlay ───────────────────────────────────────────────────

    const wireMat = new THREE.MeshBasicMaterial({
      color:       0x4488aa,
      wireframe:   true,
      transparent: true,
      opacity:     0.12,
    })
    const wireMesh = new THREE.Mesh(geo, wireMat)
    scene.add(wireMesh)

    // ── String highlight line (top edge) ────────────────────────────────────

    // Allocate enough vertices for closed string (nSigma + 2 to close the loop)
    const lineVerts = N_SIGMA + 2
    const linePos   = new Float32Array(lineVerts * 3)
    const lineGeo   = new THREE.BufferGeometry()
    const linePosAttr = new THREE.BufferAttribute(linePos, 3)
    linePosAttr.setUsage(THREE.DynamicDrawUsage)
    lineGeo.setAttribute('position', linePosAttr)

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xf0c880,
      linewidth: 2,
    })
    const stringLine = new THREE.Line(lineGeo, lineMat)
    scene.add(stringLine)

    // ── Camera ──────────────────────────────────────────────────────────────

    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.1, 200)
    camera.position.set(5, 4, 8)
    camera.lookAt(0, 0, 0)

    // ── Initial surface update ──────────────────────────────────────────────

    const mode      = (params.mode as number) ?? 1
    const amplitude = (params.amplitude as number) ?? 0.5
    const stringType = (params.stringType as string) ?? 'open'

    updateSurface(posAttr, colAttr, N_SIGMA, N_TAU, mode, amplitude, stringType, 0)
    geo.computeVertexNormals()

    updateStringLine(stringLine, N_SIGMA, mode, amplitude, stringType, 0)

    return {
      renderer,
      scene,
      camera,
      surfaceMesh,
      wireMesh,
      stringLine,
      posAttr,
      colAttr,
      nSigma:   N_SIGMA,
      nTau:     N_TAU,
      camAngle: 0,
      time:     0,
      lastType: stringType,
      lastMode: mode,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): WorldsheetState {
    const mode       = (params.mode as number) ?? 1
    const amplitude  = (params.amplitude as number) ?? 0.5
    const stringType = (params.stringType as string) ?? 'open'
    const rotate     = (params.rotate as boolean) ?? true

    // Check if we need to rebuild geometry (string type changed -> different topology)
    let { posAttr, colAttr, nSigma, nTau, lastType, lastMode } = state
    const geo = state.surfaceMesh.geometry as THREE.BufferGeometry

    if (stringType !== lastType) {
      // Rebuild geometry for topology change
      const rebuilt = buildWorldsheetGeometry(N_SIGMA, N_TAU)
      state.surfaceMesh.geometry.dispose()
      state.surfaceMesh.geometry = rebuilt.geo
      state.wireMesh.geometry    = rebuilt.geo
      posAttr = rebuilt.posAttr
      colAttr = rebuilt.colAttr
      nSigma  = N_SIGMA
      nTau    = N_TAU
    }

    // Advance time
    const time = state.time + dt * 0.5

    // Update surface vertices
    updateSurface(posAttr, colAttr, nSigma, nTau, mode, amplitude, stringType, time)
    const activeGeo = state.surfaceMesh.geometry as THREE.BufferGeometry
    activeGeo.computeVertexNormals()

    // Update string highlight
    updateStringLine(state.stringLine, nSigma, mode, amplitude, stringType, time)

    // Camera auto-rotation
    let camAngle = state.camAngle
    if (rotate) {
      camAngle += dt * 0.15
    }
    const camDist = 10
    const zoom    = (params._zoom as number) ?? 1
    const effDist = camDist / Math.max(0.1, zoom)
    state.camera.position.set(
      Math.sin(camAngle) * effDist,
      4,
      Math.cos(camAngle) * effDist,
    )
    state.camera.lookAt(0, 0, 0)

    return {
      ...state,
      posAttr,
      colAttr,
      nSigma,
      nTau,
      camAngle,
      time,
      lastType: stringType,
      lastMode: mode,
    }
  },

  // ── Render ────────────────────────────────────────────────────────────────

  render(state, canvas, _params) {
    const el = canvas as HTMLCanvasElement
    const w  = el.width
    const h  = el.height
    if (state.renderer.domElement.width !== w || state.renderer.domElement.height !== h) {
      state.renderer.setSize(w, h, false)
      state.camera.aspect = w / h
      state.camera.updateProjectionMatrix()
    }
    state.renderer.render(state.scene, state.camera)
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'slider',
        id:      'mode',
        label:   '振动模式',
        labelEn: 'Vibration mode',
        min:     1,
        max:     5,
        step:    1,
        default: 1,
      },
      {
        type:    'slider',
        id:      'amplitude',
        label:   '振幅',
        labelEn: 'Amplitude',
        min:     0.1,
        max:     1.5,
        step:    0.1,
        default: 0.5,
      },
      {
        type:    'select',
        id:      'stringType',
        label:   '弦类型',
        labelEn: 'String type',
        options: [
          { value: 'open',   label: '开弦', labelEn: 'Open string'   },
          { value: 'closed', label: '闭弦', labelEn: 'Closed string' },
        ],
        default: 'open',
      },
      {
        type:    'toggle',
        id:      'rotate',
        label:   '旋转',
        labelEn: 'Rotate',
        default: true,
      },
    ]
  },

  // ── Destroy ───────────────────────────────────────────────────────────────

  destroy(canvas) {
    const renderer = rendererStore.get(canvas)
    if (renderer) {
      renderer.dispose()
      rendererStore.delete(canvas)
    }
  },
}

export default StringWorldsheet

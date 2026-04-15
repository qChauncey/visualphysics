// ─────────────────────────────────────────────
//  Module: Higgs Field — Mexican Hat Potential
//  Renderer: Three.js
// ─────────────────────────────────────────────
//
//  V(φ) = λ(|φ|² − v²)²  with thermal correction:
//  V_eff(r, T) = (T − 1) · r²  +  λ(r² − v²)²
//  At high T the minimum is at r=0 (symmetric phase).
//  Below T=1 the Mexican hat emerges (spontaneous SSB).

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────

const LAMBDA   = 1       // quartic coupling
const V_VEV    = 1       // vacuum expectation value at T=0
const N_R      = 60      // radial segments
const N_THETA  = 80      // azimuthal segments
const R_MAX    = 2.5     // radial extent in field space
const Y_MIN    = -0.5    // clamp for potential display
const Y_MAX    =  3.5

const COL_LOW  = new THREE.Color(0x0a1a2e)   // deep well  → dark blue
const COL_HIGH = new THREE.Color(0xc8955a)   // peak       → copper

// ── Potential helpers ─────────────────────────────────────────────────────

/** Effective potential at radial distance r given temperature T */
function vEff(r: number, temp: number): number {
  const r2 = r * r
  const base = LAMBDA * (r2 - V_VEV * V_VEV) * (r2 - V_VEV * V_VEV)
  const thermal = Math.max(0, temp - 1) * r2   // thermal correction lifts origin
  return base + thermal
}

/** Clamp value into [lo, hi] */
function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x
}

// ── State type ────────────────────────────────────────────────────────────

type HiggsState = {
  renderer:    THREE.WebGLRenderer
  scene:       THREE.Scene
  camera:      THREE.PerspectiveCamera
  surfaceMesh: THREE.Mesh
  wireMesh:    THREE.Mesh
  posAttr:     THREE.BufferAttribute
  colAttr:     THREE.BufferAttribute
  ball:        THREE.Mesh
  vevRing:     THREE.Mesh
  ballR:       number
  ballPhi:     number
  ballVR:      number
  lastTemp:    number
  camAngle:    number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Surface geometry builder ──────────────────────────────────────────────

/**
 * Build a polar-grid BufferGeometry for the potential surface.
 * r ∈ [0, R_MAX], θ ∈ [0, 2π]
 * Vertex count: (N_R + 1) * (N_THETA + 1)
 */
function buildSurfaceGeometry(temp: number): {
  geo:     THREE.BufferGeometry
  posAttr: THREE.BufferAttribute
  colAttr: THREE.BufferAttribute
} {
  const nV = (N_R + 1) * (N_THETA + 1)
  const pos = new Float32Array(nV * 3)
  const col = new Float32Array(nV * 3)

  // Fill positions + colours
  let v = 0
  for (let ir = 0; ir <= N_R; ir++) {
    const r = (ir / N_R) * R_MAX
    const y = clamp(vEff(r, temp), Y_MIN, Y_MAX)
    const t = Math.min(1, Math.max(0, (y - Y_MIN) / (Y_MAX - Y_MIN)))
    const c = COL_LOW.clone().lerp(COL_HIGH, t)

    for (let ith = 0; ith <= N_THETA; ith++) {
      const theta = (ith / N_THETA) * Math.PI * 2
      pos[v * 3]     = r * Math.cos(theta)
      pos[v * 3 + 1] = y
      pos[v * 3 + 2] = r * Math.sin(theta)
      col[v * 3]     = c.r
      col[v * 3 + 1] = c.g
      col[v * 3 + 2] = c.b
      v++
    }
  }

  // Index buffer — two triangles per quad in (ir, ith) grid
  const indices: number[] = []
  const stride = N_THETA + 1
  for (let ir = 0; ir < N_R; ir++) {
    for (let ith = 0; ith < N_THETA; ith++) {
      const a = ir * stride + ith
      const b = a + 1
      const c = a + stride
      const d = c + 1
      indices.push(a, c, b,  b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(pos, 3)
  const colAttr = new THREE.BufferAttribute(col, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  colAttr.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', posAttr)
  geo.setAttribute('color',    colAttr)
  geo.setIndex(indices)
  geo.computeVertexNormals()

  return { geo, posAttr, colAttr }
}

/** Update position + colour buffers for a new temperature without rebuilding geo */
function updateSurface(
  posAttr: THREE.BufferAttribute,
  colAttr: THREE.BufferAttribute,
  geo:     THREE.BufferGeometry,
  temp:    number,
) {
  let v = 0
  for (let ir = 0; ir <= N_R; ir++) {
    const r = (ir / N_R) * R_MAX
    const y = clamp(vEff(r, temp), Y_MIN, Y_MAX)
    const t = Math.min(1, Math.max(0, (y - Y_MIN) / (Y_MAX - Y_MIN)))
    const c = COL_LOW.clone().lerp(COL_HIGH, t)

    for (let ith = 0; ith <= N_THETA; ith++) {
      const theta = (ith / N_THETA) * Math.PI * 2
      posAttr.setXYZ(v, r * Math.cos(theta), y, r * Math.sin(theta))
      colAttr.setXYZ(v, c.r, c.g, c.b)
      v++
    }
  }
  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
  geo.computeVertexNormals()
}

/** Ball y position on the surface at radial r */
function ballY(r: number, temp: number): number {
  return clamp(vEff(r, temp), Y_MIN, Y_MAX)
}

// ── Module ────────────────────────────────────────────────────────────────

const HiggsFieldModule: PhysicsModule<HiggsState> = {
  id: 'higgs-field',

  metadata: {
    title:         '希格斯场',
    titleEn:       'Higgs Field',
    description:   '希格斯势的对称破缺：高温时场处于对称相（φ=0），降温后自发选择真空期望值，赋予粒子质量。',
    descriptionEn: 'Spontaneous symmetry breaking of the Higgs potential. Above the critical temperature the field sits at φ=0; cooling below Tc the vacuum expectation value emerges, giving particles mass.',
    theory:        ['particle-physics', 'beyond-standard-model'],
    mathLevel:     2,
    renderer:      'threejs',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(canvas, params): HiggsState {
    const el   = canvas as HTMLCanvasElement
    const temp = params.temp as number ?? 1.5

    // Renderer
    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x030610)
    rendererStore.set(canvas, renderer)

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x030610)

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.4))
    const dirLight = new THREE.DirectionalLight(0xb0c8ff, 1.2)
    dirLight.position.set(3, 10, 5)
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xc8955a, 0.25)
    fillLight.position.set(0, -1, 0)
    scene.add(fillLight)

    // Surface
    const { geo, posAttr, colAttr } = buildSurfaceGeometry(temp)
    const surfaceMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side:         THREE.DoubleSide,
      roughness:    0.4,
      metalness:    0.3,
    })
    const surfaceMesh = new THREE.Mesh(geo, surfaceMat)
    scene.add(surfaceMesh)

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({
      color:       0x1a3050,
      wireframe:   true,
      transparent: true,
      opacity:     0.15,
    })
    const wireMesh = new THREE.Mesh(geo, wireMat)
    scene.add(wireMesh)

    // Ball — large bright sphere so it's easy to track
    const ballGeo = new THREE.SphereGeometry(0.18, 24, 16)
    const ballMat = new THREE.MeshStandardMaterial({
      color:             0xffd700,
      emissive:          new THREE.Color(0xffd700),
      emissiveIntensity: 1.2,
      roughness:         0.1,
    })
    const ball = new THREE.Mesh(ballGeo, ballMat)
    // Glow halo around ball
    const ballGlow = new THREE.Mesh(
      new THREE.SphereGeometry(0.30, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.12, side: THREE.BackSide }),
    )
    ball.add(ballGlow)
    scene.add(ball)

    // VEV ring — glowing circle at the trough radius (r = V_VEV = 1)
    const vevRing = new THREE.Mesh(
      new THREE.TorusGeometry(V_VEV, 0.025, 8, 80),
      new THREE.MeshBasicMaterial({ color: 0xc8955a, transparent: true, opacity: 0.55 }),
    )
    vevRing.rotation.x = Math.PI / 2
    vevRing.position.y = clamp(vEff(V_VEV, temp), Y_MIN, Y_MAX)
    scene.add(vevRing)

    // Initial ball position — start near the origin so it can roll
    const initR   = 0.1
    const initPhi = 0
    const initY   = ballY(initR, temp) + 0.12
    ball.position.set(
      initR * Math.cos(initPhi),
      initY,
      initR * Math.sin(initPhi),
    )

    // Camera — slightly elevated to show the well clearly, centred on hat rim
    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.1, 200)
    camera.position.set(0, 4.5, 8.5)
    camera.lookAt(0, 0.2, 0)

    return {
      renderer,
      scene,
      camera,
      surfaceMesh,
      wireMesh,
      posAttr,
      colAttr,
      ball,
      vevRing,
      ballR:    initR,
      ballPhi:  initPhi,
      ballVR:   0,
      lastTemp: temp,
      camAngle: 0,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): HiggsState {
    const zoom   = (params._zoom as number) ?? 1
    const temp   = Math.max(0, Math.min(2.5, (params.temp as number) / Math.max(0.1, zoom)))
    const rotate = params.rotate as boolean
    const wire   = params.wire   as boolean

    // ── Update wireframe visibility ─────────────────────────────────────────
    ;(state.wireMesh.material as THREE.MeshBasicMaterial).visible = wire

    // ── If temperature changed, update surface + give ball a kick ──────────
    let { ballR, ballPhi, ballVR, lastTemp, camAngle } = state
    if (Math.abs(temp - lastTemp) > 0.001) {
      updateSurface(state.posAttr, state.colAttr, state.surfaceMesh.geometry, temp)
      ballVR += (Math.random() - 0.5) * 0.5
      lastTemp = temp
      // VEV ring tracks the trough height
      state.vevRing.position.y = clamp(vEff(V_VEV, temp), Y_MIN, Y_MAX)
      // Show VEV ring only in broken phase (T < 1); hide it in symmetric phase
      state.vevRing.visible = temp < 1.05
    }

    // ── Ball physics: 1-D radial motion on the potential surface ───────────
    // v_eff controls where the minimum sits
    const vEffR = Math.max(0, 1 - (temp - 1))   // effective VEV radius
    // radial force: Fr = -dV_eff/dr = -4λr(r²-v_eff²) − 2(T-1)r
    const r2    = ballR * ballR
    const vev2  = vEffR * vEffR
    const fr    = -4 * LAMBDA * ballR * (r2 - vev2) - 2 * Math.max(0, temp - 1) * ballR
    // over-damped integration so ball settles
    ballVR  += (fr * 0.15 - ballVR * 0.12) * dt
    ballR    = Math.max(0, ballR + ballVR * dt)
    // slow precession around the hat
    ballPhi += dt * (0.5 + ballR * 0.3)

    // Place ball on the surface
    const by = ballY(ballR, temp) + 0.18
    state.ball.position.set(
      ballR * Math.cos(ballPhi),
      by,
      ballR * Math.sin(ballPhi),
    )

    // Ball colour: gold in broken phase (r > VEV*0.3), red in symmetric phase (near origin)
    const ballMat = state.ball.material as THREE.MeshStandardMaterial
    const inBroken = temp < 1.0 && ballR > V_VEV * 0.35
    ballMat.color.set(inBroken ? 0xffd700 : 0xff4433)
    ballMat.emissive.set(inBroken ? 0xffd700 : 0xff4433)

    // ── Camera rotation ─────────────────────────────────────────────────────
    if (rotate) {
      camAngle += dt * 0.3
      const dist = Math.sqrt(0 * 0 + 4.5 * 4.5 + 8.5 * 8.5)
      state.camera.position.set(
        Math.sin(camAngle) * dist,
        4.5,
        Math.cos(camAngle) * dist,
      )
      state.camera.lookAt(0, 0.2, 0)
    }

    return { ...state, ballR, ballPhi, ballVR, lastTemp, camAngle }
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
        id:      'temp',
        label:   '温度',
        labelEn: 'Temperature',
        min:     0,
        max:     2.5,
        step:    0.05,
        default: 1.5,
      },
      {
        type:    'toggle',
        id:      'rotate',
        label:   '镜头旋转',
        labelEn: 'Rotate camera',
        default: false,
      },
      {
        type:    'toggle',
        id:      'wire',
        label:   '线框',
        labelEn: 'Wireframe',
        default: false,
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

export default HiggsFieldModule

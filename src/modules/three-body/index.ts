// Three-Body Problem — Three.js 3D N-body with RK4
// Three massive bodies under Newtonian gravity.
// Default: Chenciner-Montgomery figure-8 orbit (2000).
// Mouse drag rotates the camera; the tiny z-perturbation eventually breaks
// the figure-8 into full 3D chaos, demonstrating sensitive dependence.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

const SOFTENING = 0.005
const TRAIL_MAX = 500
const COLORS = [0xc8955a, 0x60a5fa, 0xa8e6cf] as const

// Figure-8 initial conditions (Chenciner-Montgomery 2000, G=1, m=1)
// Tiny z offset so the orbit becomes genuinely 3D through chaos.
const FIG8 = [
  { x: -0.97000436, y:  0.24308753, z:  0.003, vx:  0.46620369, vy:  0.43236573, vz: 0 },
  { x:  0,          y:  0,          z:  0,     vx: -0.93240737, vy: -0.86473146, vz: 0 },
  { x:  0.97000436, y: -0.24308753, z: -0.003, vx:  0.46620369, vy:  0.43236573, vz: 0 },
]

type Body = {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  m: number
  mesh: THREE.Mesh
}

type Trail = {
  buf: Float32Array; head: number; filled: number
  geo: THREE.BufferGeometry
  posAttr: THREE.BufferAttribute
  colAttr: THREE.BufferAttribute
  line: THREE.Line
  color: THREE.Color
}

type ThreeBodyState = {
  renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera
  bodies: Body[]; trails: Trail[]
  t: number; azimuth: number; elevation: number
  prevMouseX: number; prevMouseY: number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Physics ───────────────────────────────────────────────────────────────────

type Vec = { x: number; y: number; z: number; vx: number; vy: number; vz: number }

function accel(bodies: Vec[], i: number, G: number) {
  let ax = 0, ay = 0, az = 0
  for (let j = 0; j < bodies.length; j++) {
    if (j === i) continue
    const dx = bodies[j].x - bodies[i].x
    const dy = bodies[j].y - bodies[i].y
    const dz = bodies[j].z - bodies[i].z
    const d2 = dx*dx + dy*dy + dz*dz + SOFTENING*SOFTENING
    const inv = G / (d2 * Math.sqrt(d2))
    ax += dx*inv; ay += dy*inv; az += dz*inv
  }
  return { ax, ay, az }
}

function rk4(bodies: Vec[], dt: number, G: number): Vec[] {
  const N = bodies.length
  const k1 = bodies.map((_, i) => accel(bodies, i, G))
  const b2  = bodies.map((b, i) => ({ x: b.x+b.vx*dt/2, y: b.y+b.vy*dt/2, z: b.z+b.vz*dt/2, vx: b.vx+k1[i].ax*dt/2, vy: b.vy+k1[i].ay*dt/2, vz: b.vz+k1[i].az*dt/2 }))
  const k2  = b2.map((_, i) => accel(b2, i, G))
  const b3  = bodies.map((b, i) => ({ x: b.x+b.vx*dt/2, y: b.y+b.vy*dt/2, z: b.z+b.vz*dt/2, vx: b.vx+k2[i].ax*dt/2, vy: b.vy+k2[i].ay*dt/2, vz: b.vz+k2[i].az*dt/2 }))
  const k3  = b3.map((_, i) => accel(b3, i, G))
  const b4  = bodies.map((b, i) => ({ x: b.x+b.vx*dt, y: b.y+b.vy*dt, z: b.z+b.vz*dt, vx: b.vx+k3[i].ax*dt, vy: b.vy+k3[i].ay*dt, vz: b.vz+k3[i].az*dt }))
  const k4  = b4.map((_, i) => accel(b4, i, G))
  return bodies.map((b, i) => ({
    x:  b.x  + (b.vx + 2*(b2[i].vx+b3[i].vx) + b4[i].vx) * dt/6,
    y:  b.y  + (b.vy + 2*(b2[i].vy+b3[i].vy) + b4[i].vy) * dt/6,
    z:  b.z  + (b.vz + 2*(b2[i].vz+b3[i].vz) + b4[i].vz) * dt/6,
    vx: b.vx + (k1[i].ax + 2*(k2[i].ax+k3[i].ax) + k4[i].ax) * dt/6,
    vy: b.vy + (k1[i].ay + 2*(k2[i].ay+k3[i].ay) + k4[i].ay) * dt/6,
    vz: b.vz + (k1[i].az + 2*(k2[i].az+k3[i].az) + k4[i].az) * dt/6,
  }))
}

// ── Trails ────────────────────────────────────────────────────────────────────

function makeTrail(scene: THREE.Scene, color: number): Trail {
  const geo     = new THREE.BufferGeometry()
  const posAttr = new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3)
  const colAttr = new THREE.BufferAttribute(new Float32Array(TRAIL_MAX * 3), 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  colAttr.setUsage(THREE.DynamicDrawUsage)
  geo.setAttribute('position', posAttr)
  geo.setAttribute('color',    colAttr)
  geo.setDrawRange(0, 0)
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true }))
  scene.add(line)
  return { buf: new Float32Array(TRAIL_MAX * 3), head: 0, filled: 0, geo, posAttr, colAttr, line, color: new THREE.Color(color) }
}

function pushTrail(t: Trail, x: number, y: number, z: number) {
  t.buf[t.head*3] = x; t.buf[t.head*3+1] = y; t.buf[t.head*3+2] = z
  t.head = (t.head + 1) % TRAIL_MAX
  if (t.filled < TRAIL_MAX) t.filled++
}

function flushTrail(t: Trail, maxLen: number) {
  const n   = Math.min(t.filled, maxLen)
  const old = (t.head - n + TRAIL_MAX) % TRAIL_MAX
  const posA = t.posAttr.array as Float32Array
  const colA = t.colAttr.array as Float32Array
  for (let i = 0; i < n; i++) {
    const s = (old + i) % TRAIL_MAX
    posA[i*3] = t.buf[s*3]; posA[i*3+1] = t.buf[s*3+1]; posA[i*3+2] = t.buf[s*3+2]
    const frac = n > 1 ? i / (n - 1) : 1
    colA[i*3] = t.color.r*frac; colA[i*3+1] = t.color.g*frac; colA[i*3+2] = t.color.b*frac
  }
  t.posAttr.needsUpdate = true; t.colAttr.needsUpdate = true
  t.geo.setDrawRange(0, n)
}

// ── Scene setup ───────────────────────────────────────────────────────────────

function buildBodiesAndTrails(scene: THREE.Scene) {
  const bodies: Body[] = FIG8.map((ic, i) => {
    const c   = new THREE.Color(COLORS[i])
    const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.6 })
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07 + 0.015*i, 20, 14), mat)
    mesh.position.set(ic.x, ic.y, ic.z)
    scene.add(mesh)
    return { ...ic, m: 1, mesh }
  })
  const trails = (COLORS as readonly number[]).map((c) => makeTrail(scene, c))
  bodies.forEach((b, i) => pushTrail(trails[i], b.x, b.y, b.z))
  return { bodies, trails }
}

// ── Module ────────────────────────────────────────────────────────────────────

const ThreeBodyModule: PhysicsModule<ThreeBodyState> = {
  id: 'three-body',

  metadata: {
    title:         '三体问题',
    titleEn:       'Three-Body Problem',
    description:   '牛顿引力下三个天体的混沌运动。从八字轨道出发，微小 z 扰动逐渐演化为三维混沌。拖曳旋转视角。',
    descriptionEn: 'Three bodies under Newtonian gravity. Starts on the figure-8 orbit — a tiny z perturbation grows into full 3D chaos. Drag to orbit.',
    theory: ['classical-mechanics'], mathLevel: 1, renderer: 'threejs',
  },

  init(canvas, _params): ThreeBodyState {
    const el = canvas as HTMLCanvasElement
    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x030610)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const dir = new THREE.DirectionalLight(0xb0c8ff, 1.2)
    dir.position.set(5, 10, 5); scene.add(dir)

    const grid = new THREE.GridHelper(4, 20, 0x1a2a3a, 0x1a2a3a)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity     = 0.15
    scene.add(grid)

    const { bodies, trails } = buildBodiesAndTrails(scene)
    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.01, 200)
    const d = 4.5, az = 0, el2 = 0.5
    camera.position.set(Math.sin(az)*Math.cos(el2)*d, Math.sin(el2)*d, Math.cos(az)*Math.cos(el2)*d)
    camera.lookAt(0, 0, 0)

    return { renderer, scene, camera, bodies, trails, t: 0, azimuth: 0, elevation: 0.5, prevMouseX: -1, prevMouseY: -1 }
  },

  tick(state, dt, params): ThreeBodyState {
    const G        = params.G        as number ?? 1
    const speed    = params.speed    as number ?? 1
    const trailLen = Math.round(params.trailLen as number ?? 250)
    const mouseX   = params._mouseX   as number ?? -1
    const mouseY   = params._mouseY   as number ?? -1
    const dragging = params._dragging as boolean ?? false

    let { azimuth, elevation, prevMouseX, prevMouseY } = state
    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      const el = state.renderer.domElement
      azimuth   -= (mouseX - prevMouseX) / el.width  * Math.PI * 3
      elevation  = Math.max(0.05, Math.min(Math.PI/2 - 0.05,
        elevation - (mouseY - prevMouseY) / el.height * Math.PI))
    }
    prevMouseX = mouseX; prevMouseY = mouseY

    const zoom = (params._zoom as number) ?? 1
    const d = 4.5 / Math.max(0.1, zoom)
    state.camera.position.set(
      Math.sin(azimuth)*Math.cos(elevation)*d,
      Math.sin(elevation)*d,
      Math.cos(azimuth)*Math.cos(elevation)*d,
    )
    state.camera.lookAt(0, 0, 0)

    const subSteps = Math.max(1, Math.round(speed * 6))
    const dtSub    = (dt * speed) / subSteps
    let vecs: Vec[] = state.bodies.map((b) => ({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz }))
    for (let s = 0; s < subSteps; s++) vecs = rk4(vecs, dtSub, G)

    state.bodies.forEach((body, i) => {
      body.x = vecs[i].x; body.y = vecs[i].y; body.z = vecs[i].z
      body.vx = vecs[i].vx; body.vy = vecs[i].vy; body.vz = vecs[i].vz
      body.mesh.position.set(body.x, body.y, body.z)
      pushTrail(state.trails[i], body.x, body.y, body.z)
      flushTrail(state.trails[i], trailLen)
    })

    return { ...state, azimuth, elevation, prevMouseX, prevMouseY, t: state.t + dt }
  },

  render(state, canvas, _params) {
    const el = canvas as HTMLCanvasElement
    const w = el.width, h = el.height
    if (state.renderer.domElement.width !== w || state.renderer.domElement.height !== h) {
      state.renderer.setSize(w, h, false)
      state.camera.aspect = w / h
      state.camera.updateProjectionMatrix()
    }
    state.renderer.render(state.scene, state.camera)
  },

  getControls(): ControlDefinition[] {
    return [
      { type: 'slider', id: 'G',        label: '引力常数', labelEn: 'Gravity G',    min: 0.1, max: 3,   step: 0.05, default: 1   },
      { type: 'slider', id: 'speed',    label: '速度',     labelEn: 'Speed',         min: 0.25,max: 4,   step: 0.25, default: 1   },
      { type: 'slider', id: 'trailLen', label: '轨迹长度', labelEn: 'Trail length',  min: 50,  max: 500, step: 50,   default: 250 },
      { type: 'button', id: 'reset',    label: '重置（八字轨道）', labelEn: 'Reset (figure-8)' },
    ]
  },

  destroy(canvas) {
    const r = rendererStore.get(canvas)
    if (r) { r.dispose(); rendererStore.delete(canvas) }
  },
}

export default ThreeBodyModule

// Three-Body Problem — Newtonian N-body with RK4
// Three presets: Chenciner-Montgomery figure-8, Lagrange equilateral triangle,
// and a random chaotic configuration. Mass sliders change each body independently;
// mesh radius scales as m^(1/3) so denser bodies look bigger.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

const SOFTENING = 0.005
const TRAIL_MAX = 500
const COLORS    = [0xc8955a, 0x60a5fa, 0xa8e6cf] as const

// ── Presets ───────────────────────────────────────────────────────────────────

type IC = { x: number; y: number; z: number; vx: number; vy: number; vz: number }

// Chenciner-Montgomery figure-8 (G=1, m=1) with tiny z perturbation
const FIG8: IC[] = [
  { x: -0.97000436, y:  0.24308753, z:  0.003, vx:  0.46620369, vy:  0.43236573, vz: 0 },
  { x:  0,          y:  0,          z:  0,     vx: -0.93240737, vy: -0.86473146, vz: 0 },
  { x:  0.97000436, y: -0.24308753, z: -0.003, vx:  0.46620369, vy:  0.43236573, vz: 0 },
]

// Lagrange equilateral triangle (G=1, m=1, side L=1, ω=√3)
// All three bodies orbit their common centre at the same angular velocity.
const R3 = 1 / Math.sqrt(3)   // circumradius
const V3 = 1                   // |v| = ω r = √3 · (1/√3)
const EQUILATERAL: IC[] = [
  { x:  R3,    y:  0,    z: 0, vx:  0,          vy:  V3,        vz: 0 },
  { x: -R3/2,  y:  0.5,  z: 0, vx: -Math.sqrt(3)/2, vy: -0.5,  vz: 0 },
  { x: -R3/2,  y: -0.5,  z: 0, vx:  Math.sqrt(3)/2, vy: -0.5,  vz: 0 },
]

function randomIC(): IC[] {
  const ics = Array.from({ length: 3 }, () => ({
    x: (Math.random() - 0.5) * 2.2,
    y: (Math.random() - 0.5) * 2.2,
    z: (Math.random() - 0.5) * 0.1,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
    vz: 0,
  }))
  // Zero total momentum
  const cx = ics.reduce((s, b) => s + b.x,  0) / 3
  const cy = ics.reduce((s, b) => s + b.y,  0) / 3
  const vx = ics.reduce((s, b) => s + b.vx, 0) / 3
  const vy = ics.reduce((s, b) => s + b.vy, 0) / 3
  ics.forEach(b => { b.x -= cx; b.y -= cy; b.vx -= vx; b.vy -= vy })
  return ics
}

function getIC(preset: string): IC[] {
  if (preset === 'equilateral') return EQUILATERAL
  if (preset === 'random')      return randomIC()
  return FIG8
}

// ── Physics ───────────────────────────────────────────────────────────────────

type Vec = { x: number; y: number; z: number; vx: number; vy: number; vz: number; m: number }

function accel(bodies: Vec[], i: number, G: number) {
  let ax = 0, ay = 0, az = 0
  for (let j = 0; j < bodies.length; j++) {
    if (j === i) continue
    const dx = bodies[j].x - bodies[i].x
    const dy = bodies[j].y - bodies[i].y
    const dz = bodies[j].z - bodies[i].z
    const d2  = dx*dx + dy*dy + dz*dz + SOFTENING*SOFTENING
    const inv = G * bodies[j].m / (d2 * Math.sqrt(d2))
    ax += dx*inv; ay += dy*inv; az += dz*inv
  }
  return { ax, ay, az }
}

function rk4step(bodies: Vec[], dt: number, G: number): Vec[] {
  const k1 = bodies.map((_, i) => accel(bodies, i, G))
  const b2  = bodies.map((b, i) => ({ ...b, x: b.x+b.vx*dt/2, y: b.y+b.vy*dt/2, z: b.z+b.vz*dt/2, vx: b.vx+k1[i].ax*dt/2, vy: b.vy+k1[i].ay*dt/2, vz: b.vz+k1[i].az*dt/2 }))
  const k2  = b2.map((_, i) => accel(b2, i, G))
  const b3  = bodies.map((b, i) => ({ ...b, x: b.x+b.vx*dt/2, y: b.y+b.vy*dt/2, z: b.z+b.vz*dt/2, vx: b.vx+k2[i].ax*dt/2, vy: b.vy+k2[i].ay*dt/2, vz: b.vz+k2[i].az*dt/2 }))
  const k3  = b3.map((_, i) => accel(b3, i, G))
  const b4  = bodies.map((b, i) => ({ ...b, x: b.x+b.vx*dt, y: b.y+b.vy*dt, z: b.z+b.vz*dt, vx: b.vx+k3[i].ax*dt, vy: b.vy+k3[i].ay*dt, vz: b.vz+k3[i].az*dt }))
  const k4  = b4.map((_, i) => accel(b4, i, G))
  return bodies.map((b, i) => ({
    ...b,
    x:  b.x  + (b.vx + 2*(b2[i].vx+b3[i].vx) + b4[i].vx) * dt/6,
    y:  b.y  + (b.vy + 2*(b2[i].vy+b3[i].vy) + b4[i].vy) * dt/6,
    z:  b.z  + (b.vz + 2*(b2[i].vz+b3[i].vz) + b4[i].vz) * dt/6,
    vx: b.vx + (k1[i].ax + 2*(k2[i].ax+k3[i].ax) + k4[i].ax) * dt/6,
    vy: b.vy + (k1[i].ay + 2*(k2[i].ay+k3[i].ay) + k4[i].ay) * dt/6,
    vz: b.vz + (k1[i].az + 2*(k2[i].az+k3[i].az) + k4[i].az) * dt/6,
  }))
}

// ── Trail helpers ─────────────────────────────────────────────────────────────

type Trail = {
  buf: Float32Array; head: number; filled: number
  geo: THREE.BufferGeometry
  posAttr: THREE.BufferAttribute; colAttr: THREE.BufferAttribute
  line: THREE.Line; color: THREE.Color
}

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
    const f = n > 1 ? i / (n - 1) : 1
    colA[i*3] = t.color.r*f; colA[i*3+1] = t.color.g*f; colA[i*3+2] = t.color.b*f
  }
  t.posAttr.needsUpdate = true; t.colAttr.needsUpdate = true
  t.geo.setDrawRange(0, n)
}

// ── Scene helpers ─────────────────────────────────────────────────────────────

type Body = Vec & { mesh: THREE.Mesh }

function makeMesh(color: number, m: number): THREE.Mesh {
  const r   = 0.06 * Math.cbrt(m)
  const c   = new THREE.Color(color)
  const mat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.55, roughness: 0.3, metalness: 0.5 })
  return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 14), mat)
}

function buildScene(
  scene: THREE.Scene,
  preset: string,
  masses: [number, number, number],
): { bodies: Body[]; trails: Trail[] } {
  const ics    = getIC(preset)
  const bodies = ics.map((ic, i) => {
    const mesh = makeMesh(COLORS[i], masses[i])
    mesh.position.set(ic.x, ic.y, ic.z)
    scene.add(mesh)
    return { ...ic, m: masses[i], mesh }
  })
  const trails = (COLORS as readonly number[]).map((c) => makeTrail(scene, c))
  bodies.forEach((b, i) => pushTrail(trails[i], b.x, b.y, b.z))
  return { bodies, trails }
}

function clearBodiesAndTrails(scene: THREE.Scene, bodies: Body[], trails: Trail[]) {
  bodies.forEach(b => scene.remove(b.mesh))
  trails.forEach(t => scene.remove(t.line))
}

// ── State ─────────────────────────────────────────────────────────────────────

type ThreeBodyState = {
  renderer:     THREE.WebGLRenderer
  scene:        THREE.Scene
  camera:       THREE.PerspectiveCamera
  bodies:       Body[]
  trails:       Trail[]
  azimuth:      number
  elevation:    number
  prevMouseX:   number
  prevMouseY:   number
  lastPreset:   string
  lastMasses:   [number, number, number]
  t:            number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Module ────────────────────────────────────────────────────────────────────

const ThreeBodyModule: PhysicsModule<ThreeBodyState> = {
  id: 'three-body',

  metadata: {
    title:       '三体问题',
    titleEn:     'Three-Body Problem',
    description:  '三个天体的引力混沌运动。八字轨道是稳定的周期解；等边三角形构型最终因扰动坍缩为混沌。',
    descriptionEn: 'Gravitational chaos of three bodies. The figure-8 is a periodic orbit; the equilateral triangle eventually collapses into chaos. Drag to orbit.',
    theory:    ['classical-mechanics'],
    mathLevel: 1,
    renderer:  'threejs',
  },

  init(canvas, params): ThreeBodyState {
    const el      = canvas as HTMLCanvasElement
    const preset  = (params.preset as string) || 'figure-8'
    const masses: [number, number, number] = [
      (params.m1 as number) || 1,
      (params.m2 as number) || 1,
      (params.m3 as number) || 1,
    ]

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x030610)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.45))
    const dir = new THREE.DirectionalLight(0xb0c8ff, 1.2)
    dir.position.set(5, 10, 5); scene.add(dir)

    const grid = new THREE.GridHelper(6, 24, 0x1a2a3a, 0x1a2a3a)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.12
    scene.add(grid)

    const { bodies, trails } = buildScene(scene, preset, masses)

    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.01, 200)
    const az = 0, el2 = 0.5, d = 4.5
    camera.position.set(Math.sin(az)*Math.cos(el2)*d, Math.sin(el2)*d, Math.cos(az)*Math.cos(el2)*d)
    camera.lookAt(0, 0, 0)

    return {
      renderer, scene, camera, bodies, trails,
      azimuth: 0, elevation: 0.5,
      prevMouseX: -1, prevMouseY: -1,
      lastPreset: preset, lastMasses: masses, t: 0,
    }
  },

  tick(state, dt, params): ThreeBodyState {
    const G        = (params.G        as number)  ?? 1
    const speed    = (params.speed    as number)  ?? 1
    const trailLen = Math.round((params.trailLen as number) ?? 250)
    const preset   = (params.preset   as string)  ?? 'figure-8'
    const mouseX   = (params._mouseX  as number)  ?? -1
    const mouseY   = (params._mouseY  as number)  ?? -1
    const dragging = (params._dragging as boolean) ?? false
    const masses: [number, number, number] = [
      (params.m1 as number) ?? 1,
      (params.m2 as number) ?? 1,
      (params.m3 as number) ?? 1,
    ]

    // ── Rebuild if preset or reset changed ─────────────────────────────────
    const presetChanged = preset !== state.lastPreset
    const doReset       = (params.reset as boolean) === true

    if (presetChanged || doReset) {
      clearBodiesAndTrails(state.scene, state.bodies, state.trails)
      const { bodies, trails } = buildScene(state.scene, preset, masses)
      // Update camera distance for equilateral (bodies start wider)
      const d = preset === 'equilateral' ? 3.5 : 4.5
      state.camera.position.setLength(d)
      return { ...state, bodies, trails, lastPreset: preset, lastMasses: masses, t: 0 }
    }

    // ── Update masses if changed (rescale meshes) ───────────────────────────
    masses.forEach((m, i) => {
      if (Math.abs(m - state.lastMasses[i]) > 0.001) {
        state.bodies[i].m = m
        const r = 0.06 * Math.cbrt(m)
        state.bodies[i].mesh.geometry.dispose()
        state.bodies[i].mesh.geometry = new THREE.SphereGeometry(r, 24, 14)
      }
    })

    // ── Camera orbit ────────────────────────────────────────────────────────
    let { azimuth, elevation, prevMouseX, prevMouseY } = state
    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      const el = state.renderer.domElement
      azimuth   -= (mouseX - prevMouseX) / el.width  * Math.PI * 3
      elevation  = Math.max(0.05, Math.min(Math.PI/2 - 0.05,
        elevation - (mouseY - prevMouseY) / el.height * Math.PI))
    }
    prevMouseX = mouseX; prevMouseY = mouseY

    const zoom = (params._zoom as number) ?? 1
    const d    = 4.5 / Math.max(0.1, zoom)
    state.camera.position.set(
      Math.sin(azimuth)*Math.cos(elevation)*d,
      Math.sin(elevation)*d,
      Math.cos(azimuth)*Math.cos(elevation)*d,
    )
    state.camera.lookAt(0, 0, 0)

    // ── Integrate ───────────────────────────────────────────────────────────
    const subSteps = Math.max(1, Math.round(speed * 6))
    const dtSub    = (dt * speed) / subSteps
    let vecs: Vec[] = state.bodies.map(b => ({ x: b.x, y: b.y, z: b.z, vx: b.vx, vy: b.vy, vz: b.vz, m: b.m }))
    for (let s = 0; s < subSteps; s++) vecs = rk4step(vecs, dtSub, G)

    state.bodies.forEach((body, i) => {
      body.x = vecs[i].x; body.y = vecs[i].y; body.z = vecs[i].z
      body.vx = vecs[i].vx; body.vy = vecs[i].vy; body.vz = vecs[i].vz
      body.mesh.position.set(body.x, body.y, body.z)
      pushTrail(state.trails[i], body.x, body.y, body.z)
      flushTrail(state.trails[i], trailLen)
    })

    return { ...state, azimuth, elevation, prevMouseX, prevMouseY, lastMasses: masses, t: state.t + dt }
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
      {
        type: 'select', id: 'preset', label: '初始构型', labelEn: 'Preset',
        default: 'figure-8',
        options: [
          { value: 'figure-8',     label: '八字轨道',     labelEn: 'Figure-8 orbit'     },
          { value: 'equilateral',  label: '等边三角形',   labelEn: 'Equilateral triangle' },
          { value: 'random',       label: '随机混沌',     labelEn: 'Random chaos'       },
        ],
      },
      { type: 'slider', id: 'm1',       label: '质量 1',   labelEn: 'Mass 1',       min: 0.2, max: 5, step: 0.1, default: 1 },
      { type: 'slider', id: 'm2',       label: '质量 2',   labelEn: 'Mass 2',       min: 0.2, max: 5, step: 0.1, default: 1 },
      { type: 'slider', id: 'm3',       label: '质量 3',   labelEn: 'Mass 3',       min: 0.2, max: 5, step: 0.1, default: 1 },
      { type: 'slider', id: 'G',        label: '引力常数', labelEn: 'Gravity G',    min: 0.1, max: 3, step: 0.05, default: 1 },
      { type: 'slider', id: 'speed',    label: '速度',     labelEn: 'Speed',        min: 0.25, max: 4, step: 0.25, default: 1 },
      { type: 'slider', id: 'trailLen', label: '轨迹长度', labelEn: 'Trail length', min: 50, max: 500, step: 50, default: 250 },
      { type: 'button', id: 'reset',    label: '重置',     labelEn: 'Reset' },
    ]
  },

  destroy(canvas) {
    const r = rendererStore.get(canvas)
    if (r) { r.dispose(); rendererStore.delete(canvas) }
  },
}

export default ThreeBodyModule

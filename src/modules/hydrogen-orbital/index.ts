// Hydrogen Orbital — Three.js 3D probability-cloud particle system
// Samples N points from |ψ_{nlm}(r,θ,φ)|² using rejection sampling in 3D.
// Renders as a dense THREE.Points cloud; mouse drag orbits the camera.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Radial + angular wave functions ──────────────────────────────────────────
// Returns (un-normalised) |ψ|² at spherical coordinates (r, cosTheta)
// Uses atomic units (Bohr radii a₀ = 1).

function psi2_3d(orbital: string, r: number, cosT: number, sinT: number, phi: number): number {
  switch (orbital) {
    case '1s':
      return Math.exp(-2 * r)

    case '2s': {
      const u = (2 - r) * Math.exp(-r / 2)
      return u * u
    }

    case '2p_z': {   // m=0, Y10 ∝ cosθ
      const u = r * cosT * Math.exp(-r / 2)
      return u * u
    }

    case '2p_x': {   // m=±1, Y11 ∝ sinθ cosφ
      const u = r * sinT * Math.cos(phi) * Math.exp(-r / 2)
      return u * u
    }

    case '3s': {
      const u = (27 - 18*r + 2*r*r) * Math.exp(-r / 3)
      return u * u
    }

    case '3p_z': {   // m=0
      const u = (6 - r) * r * cosT * Math.exp(-r / 3)
      return u * u
    }

    case '3d_z2': {  // m=0, Y20 ∝ 3cos²θ−1
      const u = r * r * (3*cosT*cosT - 1) * Math.exp(-r / 3)
      return u * u
    }

    case '3d_xz': {  // m=±1, Y21 ∝ sinθ cosθ cosφ
      const u = r * r * sinT * cosT * Math.cos(phi) * Math.exp(-r / 3)
      return u * u
    }

    default:
      return 0
  }
}

// Radial extent used for the rejection-sampling bounding box
const RMAX: Record<string, number> = {
  '1s': 8, '2s': 22, '2p_z': 20, '2p_x': 20,
  '3s': 40, '3p_z': 38, '3d_z2': 36, '3d_xz': 36,
}

// ── Sampling ──────────────────────────────────────────────────────────────────

const N_PARTICLES = 28000

function sampleCloud(orbital: string): Float32Array {
  const rmax = RMAX[orbital] ?? 20
  const pts  = new Float32Array(N_PARTICLES * 3)
  let accepted = 0

  // Find peak via sparse grid
  let peak = 0
  const steps = 40
  for (let ir = 0; ir < steps; ir++) {
    for (let it = 0; it < steps; it++) {
      const r = (ir + 0.5) / steps * rmax
      const cosT = -1 + (it + 0.5) / steps * 2
      const sinT = Math.sqrt(Math.max(0, 1 - cosT*cosT))
      const v = psi2_3d(orbital, r, cosT, sinT, 0) * r * r  // include Jacobian r²
      if (v > peak) peak = v
    }
  }
  if (peak === 0) peak = 1

  while (accepted < N_PARTICLES) {
    // Uniformly sample in a cube [-rmax, rmax]³
    const x = (Math.random() * 2 - 1) * rmax
    const y = (Math.random() * 2 - 1) * rmax
    const z = (Math.random() * 2 - 1) * rmax
    const r = Math.sqrt(x*x + y*y + z*z)
    if (r < 1e-9 || r > rmax) continue

    const cosT = z / r
    const sinT = Math.sqrt(Math.max(0, 1 - cosT*cosT))
    const phi  = Math.atan2(y, x)

    // Probability ∝ |ψ|² × r² (volume element in 3D)
    const p    = psi2_3d(orbital, r, cosT, sinT, phi) * r * r / peak
    if (Math.random() < p) {
      pts[accepted * 3]     = x
      pts[accepted * 3 + 1] = y
      pts[accepted * 3 + 2] = z
      accepted++
    }
  }
  return pts
}

// ── Colour by radius ──────────────────────────────────────────────────────────

function buildColors(positions: Float32Array, rmax: number): Float32Array {
  const cols = new Float32Array(N_PARTICLES * 3)
  // deep blue (close) → copper (mid) → white (far)
  const cInner = new THREE.Color(0x2244aa)
  const cMid   = new THREE.Color(0xc8955a)
  const cOuter = new THREE.Color(0xffffff)

  for (let i = 0; i < N_PARTICLES; i++) {
    const x = positions[i*3], y = positions[i*3+1], z = positions[i*3+2]
    const r = Math.sqrt(x*x + y*y + z*z)
    const t = Math.min(1, r / (rmax * 0.55))

    let c: THREE.Color
    if (t < 0.5) {
      c = cInner.clone().lerp(cMid, t * 2)
    } else {
      c = cMid.clone().lerp(cOuter, (t - 0.5) * 2)
    }
    cols[i*3] = c.r; cols[i*3+1] = c.g; cols[i*3+2] = c.b
  }
  return cols
}

// ── Types ─────────────────────────────────────────────────────────────────────

type HydrogenState = {
  renderer:        THREE.WebGLRenderer
  scene:           THREE.Scene
  camera:          THREE.PerspectiveCamera
  points:          THREE.Points
  posAttr:         THREE.BufferAttribute
  colAttr:         THREE.BufferAttribute
  nucleus:         THREE.Mesh
  currentOrbital:  string
  azimuth:         number
  elevation:       number
  prevMouseX:      number
  prevMouseY:      number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Module ────────────────────────────────────────────────────────────────────

const HydrogenOrbitalModule: PhysicsModule<HydrogenState> = {
  id: 'hydrogen-orbital',

  metadata: {
    title:         '氢原子轨道',
    titleEn:       'Hydrogen Orbitals',
    description:   '量子力学概率云——氢原子电子 |ψ|² 三维粒子特效。拖曳鼠标旋转。',
    descriptionEn: '3D quantum probability cloud of hydrogen wavefunctions — |ψ|² rendered as a dense particle field. Drag to rotate.',
    theory:        ['quantum-mechanics'],
    mathLevel:     2,
    renderer:      'threejs',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(canvas, params): HydrogenState {
    const el = canvas as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: false })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x000008)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()

    const orbital  = (params.orbital as string) ?? '1s'
    const positions = sampleCloud(orbital)
    const rmax     = RMAX[orbital] ?? 20
    const colors   = buildColors(positions, rmax)

    const geo      = new THREE.BufferGeometry()
    const posAttr  = new THREE.BufferAttribute(positions, 3)
    const colAttr  = new THREE.BufferAttribute(colors, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('color', colAttr)

    const mat = new THREE.PointsMaterial({
      size:          0.28,
      vertexColors:  true,
      sizeAttenuation: true,
      transparent:   true,
      opacity:       0.65,
    })
    const points = new THREE.Points(geo, mat)
    scene.add(points)

    // Nucleus (proton) — small bright sphere at origin
    const nMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0xff6644, emissive: new THREE.Color(0xff6644), emissiveIntensity: 1.2, roughness: 0.2, metalness: 0 }),
    )
    scene.add(nMesh)
    scene.add(new THREE.AmbientLight(0xffffff, 1.0))

    const camera = new THREE.PerspectiveCamera(40, el.width / el.height, 0.1, 500)
    const d = rmax * 1.4
    camera.position.set(0, 0, d)
    camera.lookAt(0, 0, 0)

    return {
      renderer, scene, camera, points, posAttr, colAttr, nucleus: nMesh,
      currentOrbital: orbital,
      azimuth: 0, elevation: 0,
      prevMouseX: -1, prevMouseY: -1,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): HydrogenState {
    const orbital  = params.orbital as string ?? '1s'
    const mouseX   = params._mouseX  as number ?? -1
    const mouseY   = params._mouseY  as number ?? -1
    const dragging = params._dragging as boolean ?? false

    // ── Resample when orbital changes ────────────────────────────────────────
    if (orbital !== state.currentOrbital) {
      const positions = sampleCloud(orbital)
      const rmax      = RMAX[orbital] ?? 20
      const colors    = buildColors(positions, rmax)

      ;(state.posAttr.array as Float32Array).set(positions)
      ;(state.colAttr.array as Float32Array).set(colors)
      state.posAttr.needsUpdate = true
      state.colAttr.needsUpdate = true

      // Adjust camera distance
      const d = rmax * 1.4
      state.camera.position.set(
        Math.sin(state.azimuth) * Math.cos(state.elevation) * d,
        Math.sin(state.elevation) * d,
        Math.cos(state.azimuth) * Math.cos(state.elevation) * d,
      )
      state.camera.lookAt(0, 0, 0)

      return { ...state, currentOrbital: orbital }
    }

    // ── Camera orbit ─────────────────────────────────────────────────────────
    let { azimuth, elevation, prevMouseX, prevMouseY } = state
    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      const el = state.renderer.domElement
      azimuth   -= (mouseX - prevMouseX) / el.width  * Math.PI * 3
      elevation  = Math.max(-Math.PI/2 + 0.05, Math.min(Math.PI/2 - 0.05,
        elevation + (mouseY - prevMouseY) / el.height * Math.PI))
    } else if (!dragging) {
      // Gentle auto-rotation when idle
      azimuth += dt * 0.18
    }
    prevMouseX = mouseX; prevMouseY = mouseY

    const rmax = RMAX[orbital] ?? 20
    const d    = rmax * 1.4
    state.camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * d,
      Math.sin(elevation) * d,
      Math.cos(azimuth) * Math.cos(elevation) * d,
    )
    state.camera.lookAt(0, 0, 0)

    // Slowly rotate the cloud itself for depth perception
    state.points.rotation.y += dt * 0.04

    return { ...state, azimuth, elevation, prevMouseX, prevMouseY }
  },

  // ── Render ────────────────────────────────────────────────────────────────

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

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type: 'select', id: 'orbital',
        label: '轨道', labelEn: 'Orbital',
        options: [
          { value: '1s',    label: '1s   基态',       labelEn: '1s   ground state'     },
          { value: '2s',    label: '2s   球对称',      labelEn: '2s   spherical node'   },
          { value: '2p_z',  label: '2p_z 哑铃',       labelEn: '2p_z dumbbell'         },
          { value: '2p_x',  label: '2p_x 哑铃',       labelEn: '2p_x dumbbell'         },
          { value: '3s',    label: '3s   两个节面',    labelEn: '3s   two nodes'        },
          { value: '3p_z',  label: '3p_z 三叶',       labelEn: '3p_z three lobes'      },
          { value: '3d_z2', label: '3d_z² 甜甜圈',    labelEn: '3d_z² donut + ring'    },
          { value: '3d_xz', label: '3d_xz 四叶',      labelEn: '3d_xz four lobes'      },
        ],
        default: '1s',
      },
    ]
  },

  // ── Destroy ───────────────────────────────────────────────────────────────

  destroy(canvas) {
    const r = rendererStore.get(canvas)
    if (r) { r.dispose(); rendererStore.delete(canvas) }
  },
}

export default HydrogenOrbitalModule

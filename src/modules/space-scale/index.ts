// Space Scale — Three.js solar-system size comparison & orbit viewer
// Two modes:
//   "comparison" – bodies lined up left→right by descending size
//   "orbit"      – bodies orbit the Sun with exaggerated radii

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Body catalogue ────────────────────────────────────────────────────────────
// relR:    radius relative to Sun (Sun = 1)
// orbitAU: semi-major axis in AU  (0 = at centre)
// period:  orbital period in days (0 = stationary)
// color:   hex colour for the sphere

type BodyDef = { name: string; relR: number; orbitAU: number; period: number; color: number }

const BODIES: BodyDef[] = [
  { name: '太阳 Sun',     relR: 1.000,  orbitAU: 0,      period: 0,      color: 0xFFE040 },
  { name: '木星 Jupiter', relR: 0.1028, orbitAU: 5.203,  period: 4332.6, color: 0xC88B3A },
  { name: '土星 Saturn',  relR: 0.0865, orbitAU: 9.537,  period: 10759,  color: 0xEAD6AA },
  { name: '天王星 Uranus', relR: 0.0367, orbitAU: 19.19,  period: 30687,  color: 0x9BD4E8 },
  { name: '海王星 Neptune',relR: 0.0346, orbitAU: 30.07,  period: 60190,  color: 0x4B70DD },
  { name: '地球 Earth',   relR: 0.0092, orbitAU: 1.000,  period: 365.25, color: 0x3B79F5 },
  { name: '金星 Venus',   relR: 0.0087, orbitAU: 0.723,  period: 224.70, color: 0xE8C060 },
  { name: '火星 Mars',    relR: 0.0049, orbitAU: 1.524,  period: 686.97, color: 0xC1440E },
  { name: '水星 Mercury', relR: 0.0035, orbitAU: 0.387,  period: 87.97,  color: 0x9E9E9E },
]

const SUN_R = 2.5   // Sun display radius in scene units (comparison mode)

// ── Precomputed comparison layout ─────────────────────────────────────────────

const GAP = 0.30   // gap between body surfaces in comparison mode

const COMP_LAYOUT: Array<{ x: number; r: number }> = (() => {
  const result: Array<{ x: number; r: number }> = []
  let cursor = 0
  for (let i = 0; i < BODIES.length; i++) {
    const r = BODIES[i].relR * SUN_R
    if (i === 0) {
      result.push({ x: 0, r })      // Sun centred at origin
      cursor = r + GAP
    } else {
      result.push({ x: cursor + r, r })
      cursor += 2 * r + GAP
    }
  }
  return result
})()

// Camera target in comparison mode = midpoint of the lineup
const COMP_CENTER_X =
  (-COMP_LAYOUT[0].r + COMP_LAYOUT[COMP_LAYOUT.length - 1].x + COMP_LAYOUT[COMP_LAYOUT.length - 1].r) / 2

// ── State ─────────────────────────────────────────────────────────────────────

type BodyMesh = { mesh: THREE.Mesh; orbitR: number; period: number; angle: number }

type SpaceState = {
  renderer:    THREE.WebGLRenderer
  scene:       THREE.Scene
  camera:      THREE.PerspectiveCamera
  bodyGroup:   THREE.Group
  bodies:      BodyMesh[]
  sunLight:    THREE.PointLight
  cameraAngle: number
  lastMode:    string
  lastSizeExp: number
}

// WeakMap lets destroy() reach the renderer without global mutation
const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStars(): THREE.Points {
  const N   = 2000
  const pos = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const phi   = Math.random() * Math.PI * 2
    const theta = Math.acos(2 * Math.random() - 1)
    const r     = 90 + Math.random() * 30
    pos[i * 3]     = r * Math.sin(theta) * Math.cos(phi)
    pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
    pos[i * 3 + 2] = r * Math.cos(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, sizeAttenuation: true }),
  )
}

function clearGroup(group: THREE.Group) {
  for (let i = group.children.length - 1; i >= 0; i--) {
    const obj = group.children[i]
    group.remove(obj)
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose()
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((m) => m.dispose())
    }
  }
}

function makeSphere(r: number, color: number, isSun: boolean): THREE.Mesh {
  const segs = r > 0.5 ? 48 : r > 0.05 ? 24 : 12
  const geo  = new THREE.SphereGeometry(Math.max(0.005, r), segs, Math.ceil(segs / 2))
  const mat  = new THREE.MeshStandardMaterial({
    color,
    emissive:          isSun ? new THREE.Color(color) : new THREE.Color(0x000000),
    emissiveIntensity: isSun ? 0.85 : 0,
    roughness:         0.85,
    metalness:         0,
  })
  return new THREE.Mesh(geo, mat)
}

// ── Scene builders ────────────────────────────────────────────────────────────

function buildComparison(group: THREE.Group, sunLight: THREE.PointLight): BodyMesh[] {
  clearGroup(group)
  const bodies: BodyMesh[] = []

  BODIES.forEach((bd, i) => {
    const { x, r } = COMP_LAYOUT[i]
    const mesh = makeSphere(r, bd.color, i === 0)
    mesh.position.set(x, 0, 0)
    group.add(mesh)
    bodies.push({ mesh, orbitR: 0, period: 0, angle: 0 })
  })

  // Sun glow ring (cheap substitute for bloom)
  const glowGeo = new THREE.SphereGeometry(SUN_R * 1.06, 32, 16)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xFFE040,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  })
  group.add(new THREE.Mesh(glowGeo, glowMat))

  sunLight.position.set(0, 0, 0)
  sunLight.intensity = 2.5
  sunLight.distance  = 300
  return bodies
}

function buildOrbit(group: THREE.Group, sunLight: THREE.PointLight, sizeExp: number): BodyMesh[] {
  clearGroup(group)
  const bodies:     BodyMesh[] = []
  const ORBIT_SCALE = 8        // 1 AU → 8 scene units

  BODIES.forEach((bd, i) => {
    const r    = Math.max(0.012, bd.relR * SUN_R * sizeExp)
    const mesh = makeSphere(r, bd.color, i === 0)

    const orbitR = bd.orbitAU * ORBIT_SCALE
    const angle  = Math.random() * Math.PI * 2
    mesh.position.set(
      i === 0 ? 0 : Math.cos(angle) * orbitR,
      0,
      i === 0 ? 0 : Math.sin(angle) * orbitR,
    )
    group.add(mesh)

    // Orbit ring
    if (orbitR > 0) {
      const rg  = new THREE.RingGeometry(orbitR - 0.06, orbitR + 0.06, 128)
      const rm  = new THREE.MeshBasicMaterial({
        color: 0x334455, side: THREE.DoubleSide,
        transparent: true, opacity: 0.45,
      })
      const ring = new THREE.Mesh(rg, rm)
      ring.rotation.x = -Math.PI / 2
      group.add(ring)
    }

    bodies.push({ mesh, orbitR, period: bd.period, angle })
  })

  sunLight.position.set(0, 0, 0)
  sunLight.intensity = 2.5
  sunLight.distance  = 600
  return bodies
}

// ── Module ────────────────────────────────────────────────────────────────────

const SpaceScaleModule: PhysicsModule<SpaceState> = {
  id: 'space-scale',

  metadata: {
    title:       '宇宙尺度',
    titleEn:     'Scale of the Universe',
    description: '太阳系天体大小对比与轨道运动——感受行星尺度的巨大差异',
    theory:      ['astrophysics', 'general-relativity'],
    mathLevel:   1,
    renderer:    'threejs',
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  init(canvas, params): SpaceState {
    const el = canvas as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x000008)
    rendererStore.set(canvas, renderer)

    const scene   = new THREE.Scene()
    const ambient = new THREE.AmbientLight(0xffffff, 0.25)
    scene.add(ambient)

    const sunLight = new THREE.PointLight(0xFFE040, 2.5, 300)
    scene.add(sunLight)

    const stars = makeStars()
    scene.add(stars)

    const bodyGroup = new THREE.Group()
    scene.add(bodyGroup)

    const bodies = buildComparison(bodyGroup, sunLight)

    const camera = new THREE.PerspectiveCamera(50, el.width / el.height, 0.005, 800)
    camera.position.set(COMP_CENTER_X, 4, 14)
    camera.lookAt(COMP_CENTER_X, 0, 0)

    return {
      renderer,
      scene,
      camera,
      bodyGroup,
      bodies,
      sunLight,
      cameraAngle: 0,
      lastMode:    'comparison',
      lastSizeExp: params.sizeExp as number ?? 30,
    }
  },

  tick(state, dt, params): SpaceState {
    const mode    = params.mode    as string
    const camSpd  = params.camSpeed as number
    const sizeExp = params.sizeExp  as number

    let { bodies, lastMode, lastSizeExp, bodyGroup, sunLight, cameraAngle } = state

    // Rebuild scene when mode changes, or when sizeExp changes in orbit mode
    const sizeChanged = mode === 'orbit' && Math.abs(sizeExp - lastSizeExp) > 0.5
    if (mode !== lastMode || sizeChanged) {
      if (mode === 'comparison') {
        bodies = buildComparison(bodyGroup, sunLight)
      } else {
        bodies = buildOrbit(bodyGroup, sunLight, sizeExp)
      }
      lastMode    = mode
      lastSizeExp = sizeExp
    }

    cameraAngle += dt * camSpd * 0.28

    if (mode === 'orbit') {
      // Advance orbital angles
      // timeSpeed=1 → Earth completes one orbit in ~10 real seconds
      const ts   = params.timeSpeed as number
      const K    = (2 * Math.PI * ts * 365.25) / (10 * 365.25)  // Earth ω at ts=1
      const updatedBodies: BodyMesh[] = bodies.map((b, i) => {
        if (i === 0 || b.period === 0) return b
        const angVel  = K / (b.period / 365.25)
        const newAngle = b.angle + angVel * dt
        b.mesh.position.x = Math.cos(newAngle) * b.orbitR
        b.mesh.position.z = Math.sin(newAngle) * b.orbitR
        return { ...b, angle: newAngle }
      })

      // Camera circles above the solar plane
      const camDist = params.camDist as number
      state.camera.position.set(
        Math.cos(cameraAngle) * camDist,
        camDist * 0.55,
        Math.sin(cameraAngle) * camDist,
      )
      state.camera.lookAt(0, 0, 0)

      return { ...state, bodies: updatedBodies, lastMode, lastSizeExp, cameraAngle }
    }

    // Comparison mode — camera gently orbits the lineup
    state.camera.position.set(
      COMP_CENTER_X + Math.cos(cameraAngle) * 11,
      3.5,
      Math.sin(cameraAngle) * 11,
    )
    state.camera.lookAt(COMP_CENTER_X, 0, 0)

    return { ...state, bodies, lastMode, lastSizeExp, cameraAngle }
  },

  render(state, canvas, _params) {
    const el = canvas as HTMLCanvasElement
    const w  = el.width
    const h  = el.height

    // Keep renderer / camera in sync with canvas size (handles DPR resize)
    if (state.renderer.domElement.width !== w || state.renderer.domElement.height !== h) {
      state.renderer.setSize(w, h, false)
      state.camera.aspect = w / h
      state.camera.updateProjectionMatrix()
    }

    state.renderer.render(state.scene, state.camera)
  },

  // ── Controls ───────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'select',
        id:      'mode',
        label:   '显示模式',
        options: [
          { value: 'comparison', label: '大小对比（并排展示）' },
          { value: 'orbit',      label: '轨道运动（缩放轨道）' },
        ],
        default: 'comparison',
      },
      {
        type:    'slider',
        id:      'camSpeed',
        label:   '镜头旋转速度',
        min:     0,
        max:     2,
        step:    0.05,
        default: 0.35,
      },
      {
        type:    'slider',
        id:      'sizeExp',
        label:   '星球放大倍率（轨道模式）',
        min:     1,
        max:     80,
        step:    1,
        default: 30,
      },
      {
        type:    'slider',
        id:      'timeSpeed',
        label:   '时间速度（轨道模式）',
        min:     0.1,
        max:     10,
        step:    0.1,
        default: 1,
      },
      {
        type:    'slider',
        id:      'camDist',
        label:   '镜头距离（轨道模式）',
        min:     50,
        max:     400,
        step:    10,
        default: 150,
      },
    ]
  },

  destroy(canvas) {
    const renderer = rendererStore.get(canvas)
    if (renderer) {
      renderer.dispose()
      rendererStore.delete(canvas)
    }
  },
}

export default SpaceScaleModule

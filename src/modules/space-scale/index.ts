// Space Scale — Three.js size comparison & orbit viewer
// Three catalogues:
//   "solar"    – planets lined up / orbit mode
//   "stars"    – neutron star → UY Scuti (log-scale rendered sizes)
//   "galaxies" – Local Group particle-cloud galaxies (Milky Way, M31, etc.)

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Solar system catalogue ────────────────────────────────────────────────────
// relR: radius relative to Sun  |  orbitAU: semi-major axis AU  |  period: days

type BodyDef = { name: string; relR: number; orbitAU: number; period: number; color: number }

const SOLAR_BODIES: BodyDef[] = [
  { name: '太阳 Sun',       relR: 1.000,  orbitAU: 0,      period: 0,      color: 0xFFE040 },
  { name: '木星 Jupiter',   relR: 0.1028, orbitAU: 5.203,  period: 4332.6, color: 0xC88B3A },
  { name: '土星 Saturn',    relR: 0.0865, orbitAU: 9.537,  period: 10759,  color: 0xEAD6AA },
  { name: '天王星 Uranus',  relR: 0.0367, orbitAU: 19.19,  period: 30687,  color: 0x9BD4E8 },
  { name: '海王星 Neptune', relR: 0.0346, orbitAU: 30.07,  period: 60190,  color: 0x4B70DD },
  { name: '地球 Earth',     relR: 0.0092, orbitAU: 1.000,  period: 365.25, color: 0x3B79F5 },
  { name: '金星 Venus',     relR: 0.0087, orbitAU: 0.723,  period: 224.70, color: 0xE8C060 },
  { name: '火星 Mars',      relR: 0.0049, orbitAU: 1.524,  period: 686.97, color: 0xC1440E },
  { name: '水星 Mercury',   relR: 0.0035, orbitAU: 0.387,  period: 87.97,  color: 0x9E9E9E },
]

// ── Stellar catalogue ─────────────────────────────────────────────────────────
// relR relative to Sun — spans ~8 orders of magnitude, rendered on log scale

const STAR_BODIES: BodyDef[] = [
  { name: '中子星 Neutron Star', relR: 1.44e-5, orbitAU: 0, period: 0, color: 0x99CCFF },
  { name: '白矮星 White Dwarf',  relR: 0.0092,  orbitAU: 0, period: 0, color: 0xCCDDFF },
  { name: '太阳 Sun',            relR: 1.000,   orbitAU: 0, period: 0, color: 0xFFE040 },
  { name: '天狼星A Sirius A',    relR: 1.711,   orbitAU: 0, period: 0, color: 0xAADDFF },
  { name: '北河三 Pollux',       relR: 8.8,     orbitAU: 0, period: 0, color: 0xFFCC88 },
  { name: '大角星 Arcturus',     relR: 25,      orbitAU: 0, period: 0, color: 0xFF9944 },
  { name: '毕宿五 Aldebaran',    relR: 44,      orbitAU: 0, period: 0, color: 0xFF7722 },
  { name: '参宿七 Rigel',        relR: 78,      orbitAU: 0, period: 0, color: 0xCCEEFF },
  { name: '参宿四 Betelgeuse',   relR: 700,     orbitAU: 0, period: 0, color: 0xFF4400 },
  { name: 'UY Scuti',            relR: 1708,    orbitAU: 0, period: 0, color: 0xFF2200 },
]

// Log-scale rendered radius: 0.10 → 4.10 scene units across full range
const STAR_LOG_MIN   = Math.log10(STAR_BODIES[0].relR)                    // ≈ −4.84
const STAR_LOG_MAX   = Math.log10(STAR_BODIES[STAR_BODIES.length - 1].relR) // ≈  3.23
const STAR_LOG_RANGE = STAR_LOG_MAX - STAR_LOG_MIN

function starLogR(relR: number): number {
  return 0.10 + (Math.log10(relR) - STAR_LOG_MIN) / STAR_LOG_RANGE * 4.0
}

// ── Layout helpers ─────────────────────────────────────────────────────────────

const GAP   = 0.30
const SUN_R = 2.5   // Sun display radius in solar comparison mode

function buildLayout(items: number[]): Array<{ x: number; r: number }> {
  const result: Array<{ x: number; r: number }> = []
  let cursor = 0
  items.forEach((r, i) => {
    if (i === 0) { result.push({ x: 0, r }); cursor = r + GAP }
    else         { result.push({ x: cursor + r, r }); cursor += 2 * r + GAP }
  })
  return result
}

const SOLAR_LAYOUT = buildLayout(SOLAR_BODIES.map((b) => b.relR * SUN_R))
const STAR_LAYOUT  = buildLayout(STAR_BODIES.map((b) => starLogR(b.relR)))

function layoutCenter(layout: Array<{ x: number; r: number }>): number {
  return (-layout[0].r + layout[layout.length - 1].x + layout[layout.length - 1].r) / 2
}

const SOLAR_CX = layoutCenter(SOLAR_LAYOUT)
const STAR_CX  = layoutCenter(STAR_LAYOUT)

// ── Galaxy definitions ────────────────────────────────────────────────────────
// Scale: 1 scene unit ≈ 50 000 light-years
// Positions chosen for visual clarity (mildly log-compressed real distances)

type GalaxyDef = {
  name: string
  type: 'spiral' | 'irregular'
  arms: number
  radius: number                        // scene units (half-diameter)
  pos: [number, number, number]
  tilt: [number, number, number]        // Euler XYZ
  nPts: number
  coreColor: number
  diskColor: number
  ptSize: number
}

const GALAXY_DEFS: GalaxyDef[] = [
  {
    name: '银河系 Milky Way', type: 'spiral', arms: 4,
    radius: 1.0, pos: [0, 0, 0], tilt: [0.18, 0, 0],
    nPts: 22000, coreColor: 0xFFEEAA, diskColor: 0x8899FF, ptSize: 0.018,
  },
  {
    name: '大麦哲伦云 LMC', type: 'irregular', arms: 0,
    radius: 0.28, pos: [2.8, -0.3, 0.8], tilt: [0.3, 0.5, 0],
    nPts: 5000, coreColor: 0xFFDDAA, diskColor: 0xFFDDAA, ptSize: 0.022,
  },
  {
    name: '小麦哲伦云 SMC', type: 'irregular', arms: 0,
    radius: 0.14, pos: [3.4, -0.5, 1.4], tilt: [0.2, 0.8, 0.1],
    nPts: 3000, coreColor: 0xFFDDB8, diskColor: 0xFFDDB8, ptSize: 0.020,
  },
  {
    name: '三角座星系 M33', type: 'spiral', arms: 3,
    radius: 0.6, pos: [-4.8, 0.4, -2.0], tilt: [0.55, 0.4, 0],
    nPts: 10000, coreColor: 0xFFEEBB, diskColor: 0x77AAFF, ptSize: 0.020,
  },
  {
    name: '仙女座星系 M31', type: 'spiral', arms: 2,
    radius: 2.2, pos: [-7.0, 0.6, -2.8], tilt: [1.3, 0.3, 0.2],
    nPts: 30000, coreColor: 0xFFEECC, diskColor: 0x9ABBFF, ptSize: 0.016,
  },
]

// ── State ─────────────────────────────────────────────────────────────────────

type BodyMesh = { mesh: THREE.Mesh; orbitR: number; period: number; angle: number }

type SpaceState = {
  renderer:       THREE.WebGLRenderer
  scene:          THREE.Scene
  camera:         THREE.PerspectiveCamera
  bodyGroup:      THREE.Group
  galaxyGroup:    THREE.Group
  bodies:         BodyMesh[]
  sunLight:       THREE.PointLight
  cameraAngle:    number
  orbitAzimuth:   number
  orbitElevation: number
  prevMouseX:     number
  prevMouseY:     number
  lastMode:       string
  lastSizeExp:    number
  lastCatalogue:  string
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Particle helpers ──────────────────────────────────────────────────────────

function makeBackgroundStars(): THREE.Points {
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
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, sizeAttenuation: true }))
}

function clearGroup(group: THREE.Group) {
  for (let i = group.children.length - 1; i >= 0; i--) {
    const obj = group.children[i] as THREE.Object3D & { geometry?: THREE.BufferGeometry; material?: THREE.Material | THREE.Material[] }
    group.remove(obj)
    obj.geometry?.dispose()
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
    else obj.material?.dispose()
  }
}

function makeSphere(r: number, color: number, emissive: boolean): THREE.Mesh {
  const segs = r > 0.5 ? 48 : r > 0.05 ? 24 : 12
  const geo  = new THREE.SphereGeometry(Math.max(0.005, r), segs, Math.ceil(segs / 2))
  const mat  = new THREE.MeshStandardMaterial({
    color,
    emissive:          emissive ? new THREE.Color(color) : new THREE.Color(0x000000),
    emissiveIntensity: emissive ? 0.85 : 0,
    roughness: 0.85, metalness: 0,
  })
  return new THREE.Mesh(geo, mat)
}

// ── Galaxy particle generators ─────────────────────────────────────────────────

function makeSpiralGalaxy(gd: GalaxyDef): THREE.Points {
  const { nPts, arms, coreColor, diskColor, ptSize } = gd
  const pos = new Float32Array(nPts * 3)
  const col = new Float32Array(nPts * 3)
  const cCore = new THREE.Color(coreColor)
  const cDisk = new THREE.Color(diskColor)

  for (let i = 0; i < nPts; i++) {
    let x: number, y: number, z: number
    let br: number
    let c: THREE.Color

    if (Math.random() < 0.25) {
      // Spherical bulge
      const r   = Math.random() * 0.18
      const phi = Math.random() * Math.PI * 2
      const ct  = Math.random() * 2 - 1
      const st  = Math.sqrt(1 - ct * ct)
      x = r * st * Math.cos(phi)
      y = r * ct * 0.35
      z = r * st * Math.sin(phi)
      br = 0.55 + 0.45 * Math.random()
      c  = cCore.clone()
    } else {
      // Log-spiral arm
      const arm    = Math.floor(Math.random() * arms)
      const base   = (arm / arms) * Math.PI * 2
      const t      = Math.random()
      const r      = 0.10 + t * 0.90
      const wind   = t * Math.PI * 2.4
      const spread = (Math.random() - 0.5) * 0.28 * (1 + t * 0.6)
      const angle  = base + wind + spread
      const dh     = (Math.random() - 0.5) * 0.04 * (1 - t * 0.8)
      x = Math.cos(angle) * r
      y = dh
      z = Math.sin(angle) * r
      br = (0.18 + 0.55 * (1 - t)) * (0.65 + 0.35 * Math.random())
      c  = cCore.clone().lerp(cDisk, t)
    }

    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z
    col[i * 3] = c.r * br; col[i * 3 + 1] = c.g * br; col[i * 3 + 2] = c.b * br
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: ptSize, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.88,
  }))
}

function makeIrregularGalaxy(gd: GalaxyDef): THREE.Points {
  const { nPts, coreColor, ptSize } = gd
  const pos = new Float32Array(nPts * 3)
  const col = new Float32Array(nPts * 3)
  const c   = new THREE.Color(coreColor)

  for (let i = 0; i < nPts; i++) {
    const r   = Math.random() * 0.5
    const phi = Math.random() * Math.PI * 2
    const ct  = Math.random() * 2 - 1
    const st  = Math.sqrt(1 - ct * ct)
    pos[i * 3]     = r * st * Math.cos(phi)
    pos[i * 3 + 1] = r * ct * 0.38
    pos[i * 3 + 2] = r * st * Math.sin(phi) * 0.6

    const br = (0.25 + 0.5 * Math.random()) * Math.max(0, 1 - r * 1.8)
    col[i * 3] = c.r * br; col[i * 3 + 1] = c.g * br; col[i * 3 + 2] = c.b * br
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: ptSize, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.78,
  }))
}

function buildGalaxies(group: THREE.Group): void {
  clearGroup(group)
  for (const gd of GALAXY_DEFS) {
    const pts = gd.type === 'spiral' ? makeSpiralGalaxy(gd) : makeIrregularGalaxy(gd)
    pts.scale.setScalar(gd.radius)
    pts.position.set(...gd.pos)
    pts.rotation.set(...gd.tilt)
    group.add(pts)
  }
}

// ── Scene builders ─────────────────────────────────────────────────────────────

function buildSolarComparison(group: THREE.Group, sunLight: THREE.PointLight): BodyMesh[] {
  clearGroup(group)
  const bodies: BodyMesh[] = []

  SOLAR_BODIES.forEach((bd, i) => {
    const { x, r } = SOLAR_LAYOUT[i]
    const mesh = makeSphere(r, bd.color, i === 0)
    mesh.position.set(x, 0, 0)
    group.add(mesh)
    bodies.push({ mesh, orbitR: 0, period: 0, angle: 0 })
  })

  // Sun glow halo
  group.add(new THREE.Mesh(
    new THREE.SphereGeometry(SUN_R * 1.06, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xFFE040, transparent: true, opacity: 0.08, side: THREE.BackSide }),
  ))

  sunLight.position.set(0, 0, 0)
  sunLight.intensity = 2.5
  sunLight.distance  = 300
  return bodies
}

function buildStarComparison(group: THREE.Group, sunLight: THREE.PointLight): BodyMesh[] {
  clearGroup(group)
  const bodies: BodyMesh[] = []

  STAR_BODIES.forEach((bd, i) => {
    const { x, r } = STAR_LAYOUT[i]
    const mesh = makeSphere(r, bd.color, true) // all stars are self-luminous
    mesh.position.set(x, 0, 0)
    group.add(mesh)
    bodies.push({ mesh, orbitR: 0, period: 0, angle: 0 })
  })

  // Light from Sun position
  const sunIdx = STAR_BODIES.findIndex((b) => b.relR === 1.0)
  sunLight.position.set(STAR_LAYOUT[sunIdx].x, 0, 0)
  sunLight.intensity = 2.0
  sunLight.distance  = 500
  return bodies
}

function buildOrbit(group: THREE.Group, sunLight: THREE.PointLight, sizeExp: number): BodyMesh[] {
  clearGroup(group)
  const bodies: BodyMesh[] = []
  const ORBIT_SCALE = 8

  SOLAR_BODIES.forEach((bd, i) => {
    const r     = Math.max(0.012, bd.relR * SUN_R * sizeExp)
    const mesh  = makeSphere(r, bd.color, i === 0)
    const orbitR = bd.orbitAU * ORBIT_SCALE
    const angle  = Math.random() * Math.PI * 2
    mesh.position.set(i === 0 ? 0 : Math.cos(angle) * orbitR, 0, i === 0 ? 0 : Math.sin(angle) * orbitR)
    group.add(mesh)

    if (orbitR > 0) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(orbitR - 0.06, orbitR + 0.06, 128),
        new THREE.MeshBasicMaterial({ color: 0x334455, side: THREE.DoubleSide, transparent: true, opacity: 0.45 }),
      )
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
    title:         '宇宙尺度',
    titleEn:       'Scale of the Universe',
    description:   '从行星到星系群——探索宇宙中令人叹为观止的尺度差异',
    descriptionEn: 'From planets to the Local Group — explore the breathtaking scale of the universe.',
    theory:        ['astrophysics', 'general-relativity'],
    mathLevel:     1,
    renderer:      'threejs',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(canvas, params): SpaceState {
    const el = canvas as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x000008)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    const sunLight = new THREE.PointLight(0xFFE040, 2.5, 300)
    scene.add(sunLight)
    scene.add(makeBackgroundStars())

    const bodyGroup   = new THREE.Group()
    const galaxyGroup = new THREE.Group()
    scene.add(bodyGroup)
    scene.add(galaxyGroup)

    const catalogue = (params.catalogue as string) ?? 'solar'
    let bodies: BodyMesh[] = []

    if (catalogue === 'stars') {
      bodies = buildStarComparison(bodyGroup, sunLight)
      galaxyGroup.visible = false
    } else if (catalogue === 'galaxies') {
      buildGalaxies(galaxyGroup)
      bodyGroup.visible = false
    } else {
      bodies = buildSolarComparison(bodyGroup, sunLight)
      galaxyGroup.visible = false
    }

    const camera = new THREE.PerspectiveCamera(50, el.width / el.height, 0.005, 800)
    camera.position.set(SOLAR_CX, 4, 14)
    camera.lookAt(SOLAR_CX, 0, 0)

    return {
      renderer, scene, camera, bodyGroup, galaxyGroup, bodies, sunLight,
      cameraAngle: 0, orbitAzimuth: 0, orbitElevation: 0,
      prevMouseX: -1, prevMouseY: -1,
      lastMode: 'comparison', lastSizeExp: (params.sizeExp as number) ?? 30,
      lastCatalogue: catalogue,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): SpaceState {
    const catalogue = (params.catalogue as string)  ?? 'solar'
    const mode      = (params.mode      as string)  ?? 'comparison'
    const camSpd    = (params.camSpeed  as number)  ?? 0.35
    const sizeExp   = (params.sizeExp   as number)  ?? 30
    const mouseX    = (params._mouseX   as number)  ?? -1
    const mouseY    = (params._mouseY   as number)  ?? -1
    const dragging  = (params._dragging as boolean) ?? false

    // Mouse-drag orbit
    let { orbitAzimuth, orbitElevation, prevMouseX, prevMouseY } = state
    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      const el = state.renderer.domElement
      orbitAzimuth   -= ((mouseX - prevMouseX) / el.width)  * Math.PI * 3
      orbitElevation  = Math.max(-0.55, Math.min(0.75,
        orbitElevation - ((mouseY - prevMouseY) / el.height) * 2))
    }
    prevMouseX = mouseX; prevMouseY = mouseY

    let { bodies, lastMode, lastSizeExp, lastCatalogue,
          bodyGroup, galaxyGroup, sunLight, cameraAngle } = state

    // ── Catalogue switch ────────────────────────────────────────────────────
    if (catalogue !== lastCatalogue) {
      if (catalogue === 'solar') {
        galaxyGroup.visible = false
        bodyGroup.visible   = true
        bodies = buildSolarComparison(bodyGroup, sunLight)
        state.camera.position.set(SOLAR_CX, 4, 14)
        state.camera.lookAt(SOLAR_CX, 0, 0)
      } else if (catalogue === 'stars') {
        galaxyGroup.visible = false
        bodyGroup.visible   = true
        bodies = buildStarComparison(bodyGroup, sunLight)
        state.camera.position.set(STAR_CX, 5, 18)
        state.camera.lookAt(STAR_CX, 0, 0)
      } else {
        bodyGroup.visible   = false
        galaxyGroup.visible = true
        buildGalaxies(galaxyGroup)
        state.camera.position.set(0, 6, 22)
        state.camera.lookAt(-3, 0, -1)
      }
      cameraAngle    = 0
      orbitAzimuth   = 0
      orbitElevation = 0
      lastCatalogue  = catalogue
      lastMode       = mode
    }

    // ── Mode / sizeExp switch (solar only) ─────────────────────────────────
    if (catalogue === 'solar') {
      const sizeChanged = mode === 'orbit' && Math.abs(sizeExp - lastSizeExp) > 0.5
      if (mode !== lastMode) {
        bodies    = mode === 'comparison'
          ? buildSolarComparison(bodyGroup, sunLight)
          : buildOrbit(bodyGroup, sunLight, sizeExp)
        lastMode  = mode
        lastSizeExp = sizeExp
      } else if (sizeChanged) {
        bodies    = buildOrbit(bodyGroup, sunLight, sizeExp)
        lastSizeExp = sizeExp
      }
    }

    if (!dragging) cameraAngle += dt * camSpd * 0.28

    // ── Camera — galaxy mode ────────────────────────────────────────────────
    if (catalogue === 'galaxies') {
      const pivot = { x: -3.5, z: -1.0 }
      const d     = 20
      const angle = cameraAngle + orbitAzimuth
      const elevY = d * (0.30 + orbitElevation)
      const elevR = Math.sqrt(Math.max(0.01, d * d - elevY * elevY))
      state.camera.position.set(
        pivot.x + Math.cos(angle) * elevR, elevY,
        pivot.z + Math.sin(angle) * elevR,
      )
      state.camera.lookAt(pivot.x, 0, pivot.z)
      return { ...state, bodies, lastMode, lastSizeExp, lastCatalogue,
        cameraAngle, orbitAzimuth, orbitElevation, prevMouseX, prevMouseY }
    }

    // ── Camera — stars comparison ────────────────────────────────────────────
    if (catalogue === 'stars') {
      const angle = cameraAngle + orbitAzimuth
      state.camera.position.set(
        STAR_CX + Math.cos(angle) * 15,
        3.5 + orbitElevation * 5,
        Math.sin(angle) * 15,
      )
      state.camera.lookAt(STAR_CX, 0, 0)
      return { ...state, bodies, lastMode, lastSizeExp, lastCatalogue,
        cameraAngle, orbitAzimuth, orbitElevation, prevMouseX, prevMouseY }
    }

    // ── Camera — solar orbit ─────────────────────────────────────────────────
    if (mode === 'orbit') {
      const ts  = (params.timeSpeed as number) ?? 1
      const K   = (2 * Math.PI * ts * 365.25) / (10 * 365.25)
      const updatedBodies = bodies.map((b, i) => {
        if (i === 0 || b.period === 0) return b
        const newAngle = b.angle + (K / (b.period / 365.25)) * dt
        b.mesh.position.x = Math.cos(newAngle) * b.orbitR
        b.mesh.position.z = Math.sin(newAngle) * b.orbitR
        return { ...b, angle: newAngle }
      })

      const camDist = (params.camDist as number) ?? 150
      const angle   = cameraAngle + orbitAzimuth
      const elevY   = camDist * (0.55 + orbitElevation)
      const elevR   = Math.sqrt(Math.max(0.01, camDist * camDist - elevY * elevY))
      state.camera.position.set(Math.cos(angle) * elevR, elevY, Math.sin(angle) * elevR)
      state.camera.lookAt(0, 0, 0)
      return { ...state, bodies: updatedBodies, lastMode, lastSizeExp, lastCatalogue,
        cameraAngle, orbitAzimuth, orbitElevation, prevMouseX, prevMouseY }
    }

    // ── Camera — solar comparison ────────────────────────────────────────────
    const angle = cameraAngle + orbitAzimuth
    state.camera.position.set(
      SOLAR_CX + Math.cos(angle) * 11,
      3.5 + orbitElevation * 5,
      Math.sin(angle) * 11,
    )
    state.camera.lookAt(SOLAR_CX, 0, 0)
    return { ...state, bodies, lastMode, lastSizeExp, lastCatalogue,
      cameraAngle, orbitAzimuth, orbitElevation, prevMouseX, prevMouseY }
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
        type: 'select', id: 'catalogue',
        label: '尺度级别', labelEn: 'Scale level',
        options: [
          { value: 'solar',    label: '太阳系 Solar System', labelEn: 'Solar System' },
          { value: 'stars',    label: '恒星尺度 Stars',       labelEn: 'Stellar Scale' },
          { value: 'galaxies', label: '星系群 Local Group',   labelEn: 'Local Group' },
        ],
        default: 'solar',
      },
      {
        type: 'select', id: 'mode',
        label: '显示模式', labelEn: 'Display mode',
        options: [
          { value: 'comparison', label: '大小对比（并排展示）', labelEn: 'Size comparison' },
          { value: 'orbit',      label: '轨道运动（仅太阳系）', labelEn: 'Orbital motion (solar only)' },
        ],
        default: 'comparison',
      },
      {
        type: 'slider', id: 'camSpeed', label: '镜头旋转速度', labelEn: 'Camera rotation speed',
        min: 0, max: 2, step: 0.05, default: 0.35,
      },
      {
        type: 'slider', id: 'sizeExp', label: '星球放大倍率（轨道模式）', labelEn: 'Planet scale (orbit mode)',
        min: 1, max: 80, step: 1, default: 30,
      },
      {
        type: 'slider', id: 'timeSpeed', label: '时间速度（轨道模式）', labelEn: 'Time speed (orbit mode)',
        min: 0.1, max: 10, step: 0.1, default: 1,
      },
      {
        type: 'slider', id: 'camDist', label: '镜头距离（轨道模式）', labelEn: 'Camera distance (orbit mode)',
        min: 50, max: 400, step: 10, default: 150,
      },
    ]
  },

  // ── Destroy ───────────────────────────────────────────────────────────────

  destroy(canvas) {
    const r = rendererStore.get(canvas)
    if (r) { r.dispose(); rendererStore.delete(canvas) }
  },
}

export default SpaceScaleModule

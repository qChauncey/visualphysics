// Schwarzschild Black Hole — Four GR black hole solutions in 3D
// Schwarzschild, Kerr, Reissner-Nordström, and Kerr-Newman spacetimes.
// Accretion disk particles, photon sphere, ergosphere, and relativistic jets.
//
// Natural units: G = c = 1, mass M = 1

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────────

const N_DISK = 8000
const N_JET  = 2000
const N_STARS = 2000

// ── Black hole parameter tables ───────────────────────────────────────────────

type BHParams = {
  ehR:       number   // event horizon radius
  phR:       number   // photon sphere radius
  iscoR:     number   // ISCO radius
  innerHR?:  number   // inner horizon radius (RN only)
  ergoEq?:   number   // ergosphere equatorial radius
  ergoPol?:  number   // ergosphere polar radius
  hasJets:   boolean
  ehColor:   number   // event horizon tint
  haloColor: number
  charged:   boolean
}

const BH_TABLE: Record<string, BHParams> = {
  schwarzschild: {
    ehR:      2,
    phR:      3,
    iscoR:    6,
    hasJets:  false,
    ehColor:  0x000000,
    haloColor:0xff6600,
    charged:  false,
  },
  kerr: {
    // a = 0.9, M = 1  →  r+ = 1 + sqrt(1 - 0.81) = 1 + sqrt(0.19)
    ehR:      1 + Math.sqrt(0.19),           // ≈ 1.436
    phR:      2 * (1 + Math.cos((2 / 3) * Math.acos(-0.9))),  // prograde ≈ 1.51
    iscoR:    2.32,
    ergoEq:   2,                             // equatorial ergosphere = 2M on equator
    ergoPol:  1 + Math.sqrt(0.19),           // same as r+ at poles ≈ 1.436
    hasJets:  true,
    ehColor:  0x000000,
    haloColor:0xff6600,
    charged:  false,
  },
  reissner: {
    // Q = 0.8, M = 1  →  r+ = 1 + sqrt(1 - 0.64) = 1.6
    ehR:      1 + Math.sqrt(0.36),           // = 1.6
    phR:      (3 + Math.sqrt(9 - 5.12)) / 2, // ≈ (3 + 1.97) / 2 ≈ 2.485
    iscoR:    4.6,
    innerHR:  1 - Math.sqrt(0.36),           // = 0.4
    hasJets:  false,
    ehColor:  0x001133,                      // slight blue tint
    haloColor:0x3366ff,
    charged:  true,
  },
  'kerr-newman': {
    // a = 0.7, Q = 0.5, M = 1  →  r+ = 1 + sqrt(1 - 0.49 - 0.25) = 1 + sqrt(0.26)
    ehR:      1 + Math.sqrt(0.26),           // ≈ 1.510
    phR:      2.2,
    iscoR:    3.5,
    ergoEq:   1 + Math.sqrt(1 - 0.25),      // ≈ 1 + sqrt(0.75) ≈ 1.866
    ergoPol:  1 + Math.sqrt(0.26),           // same as r+ ≈ 1.510
    hasJets:  true,
    ehColor:  0x110800,                      // slight golden tint
    haloColor:0xcc8833,
    charged:  true,
  },
}

// ── State ─────────────────────────────────────────────────────────────────────

type BHState = {
  renderer:   THREE.WebGLRenderer
  scene:      THREE.Scene
  camera:     THREE.PerspectiveCamera
  bhGroup:    THREE.Group
  diskPts:    THREE.Points
  diskPos:    Float32Array
  diskAngle:  Float32Array
  diskOmega:  Float32Array
  diskR:      Float32Array          // stored radius per particle
  jetPts1?:   THREE.Points
  jetPts2?:   THREE.Points
  jetPos1?:   Float32Array
  jetPos2?:   Float32Array
  jetT1?:     Float32Array
  jetT2?:     Float32Array
  t:          number
  azimuth:    number
  elevation:  number
  prevMouseX: number
  prevMouseY: number
  lastBHType: string
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

function makeBackgroundStars(scene: THREE.Scene): void {
  const pos = new Float32Array(N_STARS * 3)
  for (let i = 0; i < N_STARS; i++) {
    const theta = Math.acos(2 * Math.random() - 1)
    const phi   = Math.random() * Math.PI * 2
    const r     = 200
    pos[i * 3]     = r * Math.sin(theta) * Math.cos(phi)
    pos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
    pos[i * 3 + 2] = r * Math.cos(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.7 })
  scene.add(new THREE.Points(geo, mat))
}

function buildBHGroup(bhType: string): THREE.Group {
  const bh    = BH_TABLE[bhType] ?? BH_TABLE['schwarzschild']
  const group = new THREE.Group()

  // ── Event horizon sphere ────────────────────────────────────────────────────
  const ehGeo = new THREE.SphereGeometry(bh.ehR, 48, 32)
  const ehMat = new THREE.MeshStandardMaterial({
    color:     bh.ehColor,
    roughness: 1,
    metalness: 0,
  })
  group.add(new THREE.Mesh(ehGeo, ehMat))

  // ── Event horizon outer halo ────────────────────────────────────────────────
  const haloGeo = new THREE.SphereGeometry(bh.ehR * 1.15, 32, 16)
  const haloMat = new THREE.MeshBasicMaterial({
    color:       bh.haloColor,
    transparent: true,
    opacity:     0.12,
    side:        THREE.BackSide,
    depthWrite:  false,
  })
  group.add(new THREE.Mesh(haloGeo, haloMat))

  // ── Photon sphere (transparent glow + equatorial ring) ──────────────────────
  const phGeo = new THREE.SphereGeometry(bh.phR, 48, 32)
  const phMat = new THREE.MeshBasicMaterial({
    color:       0xffffaa,
    transparent: true,
    opacity:     0.06,
    side:        THREE.FrontSide,
    depthWrite:  false,
  })
  const phMesh = new THREE.Mesh(phGeo, phMat)
  phMesh.userData.isPhotonSphere = true
  group.add(phMesh)

  const ringGeo = new THREE.TorusGeometry(bh.phR, 0.04, 16, 64)
  const ringMat = new THREE.MeshBasicMaterial({
    color:       0xffffaa,
    transparent: true,
    opacity:     0.7,
    depthWrite:  false,
  })
  const ringMesh = new THREE.Mesh(ringGeo, ringMat)
  ringMesh.userData.isPhotonSphere = true
  group.add(ringMesh)

  // ── ISCO ring ───────────────────────────────────────────────────────────────
  const iscoGeo = new THREE.TorusGeometry(bh.iscoR, 0.03, 8, 64)
  const iscoMat = new THREE.MeshBasicMaterial({
    color:       0xc8955a,
    transparent: true,
    opacity:     0.35,
    depthWrite:  false,
  })
  const iscoMesh = new THREE.Mesh(iscoGeo, iscoMat)
  iscoMesh.userData.isISCO = true
  group.add(iscoMesh)

  // ── Inner horizon (Reissner-Nordström only) ──────────────────────────────────
  if (bh.innerHR !== undefined) {
    const ihGeo = new THREE.TorusGeometry(bh.innerHR, 0.05, 8, 64)
    const ihMat = new THREE.MeshBasicMaterial({
      color:       0x6699ff,
      transparent: true,
      opacity:     0.5,
      depthWrite:  false,
    })
    group.add(new THREE.Mesh(ihGeo, ihMat))
  }

  // ── Ergosphere (Kerr and Kerr-Newman only) ───────────────────────────────────
  if (bh.ergoEq !== undefined && bh.ergoPol !== undefined) {
    const ergoGeo = new THREE.SphereGeometry(bh.ergoEq, 32, 16)
    const ergoMat = new THREE.MeshBasicMaterial({
      color:       0x4466ff,
      transparent: true,
      opacity:     0.08,
      side:        THREE.BackSide,
      depthWrite:  false,
    })
    const ergo    = new THREE.Mesh(ergoGeo, ergoMat)
    ergo.scale.y  = bh.ergoPol / bh.ergoEq
    group.add(ergo)
  }

  return group
}

function buildDisk(bhType: string): {
  diskPts:   THREE.Points
  diskPos:   Float32Array
  diskAngle: Float32Array
  diskOmega: Float32Array
  diskR:     Float32Array
} {
  const bh       = BH_TABLE[bhType] ?? BH_TABLE['schwarzschild']
  const r_inner  = bh.iscoR
  const r_outer  = bh.iscoR * 3

  const diskPos   = new Float32Array(N_DISK * 3)
  const diskAngle = new Float32Array(N_DISK)
  const diskOmega = new Float32Array(N_DISK)
  const diskR     = new Float32Array(N_DISK)
  const diskCol   = new Float32Array(N_DISK * 3)

  const cInner = new THREE.Color(0xfff5cc)
  const cOuter = new THREE.Color(0xff3300)

  for (let i = 0; i < N_DISK; i++) {
    const r     = r_inner + Math.random() * (r_outer - r_inner)
    const angle = Math.random() * Math.PI * 2
    const h     = (Math.random() - 0.5) * r * 0.06

    diskPos[i * 3]     = Math.cos(angle) * r
    diskPos[i * 3 + 1] = h
    diskPos[i * 3 + 2] = Math.sin(angle) * r
    diskAngle[i]       = angle
    diskOmega[i]       = 1 / Math.pow(r, 1.5)   // Keplerian ω ∝ r^-3/2
    diskR[i]           = r

    const t          = (r - r_inner) / (r_outer - r_inner)
    const c          = cInner.clone().lerp(cOuter, t)
    const brightness = 0.5 + 0.5 * Math.random()
    diskCol[i * 3]     = c.r * brightness
    diskCol[i * 3 + 1] = c.g * brightness
    diskCol[i * 3 + 2] = c.b * brightness
  }

  const diskGeo  = new THREE.BufferGeometry()
  const posAttr  = new THREE.BufferAttribute(diskPos, 3)
  posAttr.setUsage(THREE.DynamicDrawUsage)
  diskGeo.setAttribute('position', posAttr)
  diskGeo.setAttribute('color', new THREE.BufferAttribute(diskCol, 3))

  const diskMat  = new THREE.PointsMaterial({
    size:            0.05,
    vertexColors:    true,
    sizeAttenuation: true,
    transparent:     true,
    opacity:         0.75,
    depthWrite:      false,
  })
  const diskPts  = new THREE.Points(diskGeo, diskMat)

  return { diskPts, diskPos, diskAngle, diskOmega, diskR }
}

function buildJets(bhType: string): {
  jetPts1: THREE.Points
  jetPts2: THREE.Points
  jetPos1: Float32Array
  jetPos2: Float32Array
  jetT1:   Float32Array
  jetT2:   Float32Array
} {
  const bh    = BH_TABLE[bhType] ?? BH_TABLE['schwarzschild']
  const r_eh  = bh.ehR
  const JET_H = 12

  function initJetArray(sign: number): { pts: THREE.Points; pos: Float32Array; t: Float32Array } {
    const pos = new Float32Array(N_JET * 3)
    const t   = new Float32Array(N_JET)
    const col = new Float32Array(N_JET * 3)

    for (let i = 0; i < N_JET; i++) {
      t[i]        = Math.random()
      const ti    = t[i]
      const y     = sign * (r_eh + ti * JET_H)
      const spread = ti * 0.3
      const phi   = Math.random() * Math.PI * 2
      pos[i * 3]     = Math.cos(phi) * spread
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = Math.sin(phi) * spread

      // Cyan/white near base, fading blue outward
      const brightness = 1.0 - ti * 0.7
      col[i * 3]     = brightness * 0.6
      col[i * 3 + 1] = brightness * 0.9
      col[i * 3 + 2] = brightness * 1.0
    }

    const geo    = new THREE.BufferGeometry()
    const posAttr = new THREE.BufferAttribute(pos, 3)
    posAttr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', posAttr)
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))

    const mat = new THREE.PointsMaterial({
      size:            0.06,
      vertexColors:    true,
      sizeAttenuation: true,
      transparent:     true,
      opacity:         0.65,
      depthWrite:      false,
    })
    return { pts: new THREE.Points(geo, mat), pos, t }
  }

  const up   = initJetArray(+1)
  const down = initJetArray(-1)

  return {
    jetPts1: up.pts,
    jetPts2: down.pts,
    jetPos1: up.pos,
    jetPos2: down.pos,
    jetT1:   up.t,
    jetT2:   down.t,
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

const SchwarzschildModule: PhysicsModule<BHState> = {
  id: 'schwarzschild',

  metadata: {
    title:        '黑洞时空',
    titleEn:      'Black Hole Spacetime',
    description:  '四种广义相对论黑洞：史瓦西、克尔、莱斯纳-诺德斯特伦与克尔-纽曼。吸积盘、光子球与相对论喷流实时模拟。',
    descriptionEn:'Four black hole solutions of general relativity: Schwarzschild, Kerr, Reissner-Nordström, and Kerr-Newman. Accretion disk, photon sphere, and relativistic jets rendered in real time.',
    theory:       ['general-relativity'],
    mathLevel:    2,
    renderer:     'threejs',
  },

  // ── Init ────────────────────────────────────────────────────────────────────

  init(canvas, params): BHState {
    const el     = canvas as HTMLCanvasElement
    const bhType = (params.bhType as string) ?? 'schwarzschild'

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x040408)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    rendererStore.set(canvas, renderer)

    // ── Scene ─────────────────────────────────────────────────────────────────
    const scene = new THREE.Scene()

    // Background stars
    makeBackgroundStars(scene)

    // Lighting
    scene.add(new THREE.AmbientLight(0x080818, 1.0))
    const diskLight = new THREE.PointLight(0xff8833, 2.0, 30)
    diskLight.position.set(0, 0, 0)
    scene.add(diskLight)
    const rimLight = new THREE.DirectionalLight(0x4466aa, 0.8)
    rimLight.position.set(-5, 8, -5)
    scene.add(rimLight)

    // ── BH geometry group ─────────────────────────────────────────────────────
    const bhGroup = buildBHGroup(bhType)
    scene.add(bhGroup)

    // ── Accretion disk ────────────────────────────────────────────────────────
    const { diskPts, diskPos, diskAngle, diskOmega, diskR } = buildDisk(bhType)
    scene.add(diskPts)

    // ── Jets (Kerr / Kerr-Newman) ─────────────────────────────────────────────
    let jetPts1: THREE.Points | undefined
    let jetPts2: THREE.Points | undefined
    let jetPos1: Float32Array | undefined
    let jetPos2: Float32Array | undefined
    let jetT1:   Float32Array | undefined
    let jetT2:   Float32Array | undefined

    const bh = BH_TABLE[bhType] ?? BH_TABLE['schwarzschild']
    if (bh.hasJets) {
      const jets = buildJets(bhType)
      jetPts1 = jets.jetPts1; jetPts2 = jets.jetPts2
      jetPos1 = jets.jetPos1; jetPos2 = jets.jetPos2
      jetT1   = jets.jetT1;   jetT2   = jets.jetT2
      scene.add(jetPts1)
      scene.add(jetPts2)
    }

    // ── Camera ────────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.05, 500)
    camera.position.set(0, 6, 16)
    camera.lookAt(0, 0, 0)

    return {
      renderer, scene, camera,
      bhGroup,
      diskPts, diskPos, diskAngle, diskOmega, diskR,
      jetPts1, jetPts2, jetPos1, jetPos2, jetT1, jetT2,
      t:          0,
      azimuth:    0,
      elevation:  0.37,
      prevMouseX: -1,
      prevMouseY: -1,
      lastBHType: bhType,
    }
  },

  // ── Tick ────────────────────────────────────────────────────────────────────

  tick(state, dt, params): BHState {
    const bhType  = (params.bhType  as string)  ?? 'schwarzschild'
    const speed   = (params.speed   as number)  ?? 1
    const showPS  = (params.showPhotonSphere as boolean) ?? true
    const showISCO = (params.showISCO as boolean) ?? true

    // Clamp dt to avoid large jumps when tab was hidden
    const safeDt  = Math.min(dt, 0.05)

    // ── BH type switch ─────────────────────────────────────────────────────────
    if (bhType !== state.lastBHType) {
      // Remove old BH geometry and jets from scene
      state.scene.remove(state.bhGroup)
      state.scene.remove(state.diskPts)
      if (state.jetPts1) state.scene.remove(state.jetPts1)
      if (state.jetPts2) state.scene.remove(state.jetPts2)

      // Dispose old geometries
      state.diskPts.geometry.dispose()
      ;(state.diskPts.material as THREE.Material).dispose()
      if (state.jetPts1) {
        state.jetPts1.geometry.dispose()
        ;(state.jetPts1.material as THREE.Material).dispose()
      }
      if (state.jetPts2) {
        state.jetPts2.geometry.dispose()
        ;(state.jetPts2.material as THREE.Material).dispose()
      }

      // Build new geometry
      const bhGroup = buildBHGroup(bhType)
      state.scene.add(bhGroup)

      const { diskPts, diskPos, diskAngle, diskOmega, diskR } = buildDisk(bhType)
      state.scene.add(diskPts)

      const newBH = BH_TABLE[bhType] ?? BH_TABLE['schwarzschild']
      let jetPts1: THREE.Points | undefined
      let jetPts2: THREE.Points | undefined
      let jetPos1: Float32Array | undefined
      let jetPos2: Float32Array | undefined
      let jetT1:   Float32Array | undefined
      let jetT2:   Float32Array | undefined

      if (newBH.hasJets) {
        const jets = buildJets(bhType)
        jetPts1 = jets.jetPts1; jetPts2 = jets.jetPts2
        jetPos1 = jets.jetPos1; jetPos2 = jets.jetPos2
        jetT1   = jets.jetT1;   jetT2   = jets.jetT2
        state.scene.add(jetPts1)
        state.scene.add(jetPts2)
      }

      state.bhGroup    = bhGroup
      state.diskPts    = diskPts
      state.diskPos    = diskPos
      state.diskAngle  = diskAngle
      state.diskOmega  = diskOmega
      state.diskR      = diskR
      state.jetPts1    = jetPts1
      state.jetPts2    = jetPts2
      state.jetPos1    = jetPos1
      state.jetPos2    = jetPos2
      state.jetT1      = jetT1
      state.jetT2      = jetT2
      state.lastBHType = bhType
    }

    // ── Photon sphere / ISCO visibility ────────────────────────────────────────
    state.bhGroup.children.forEach((child) => {
      if (child.userData.isPhotonSphere) child.visible = showPS
      if (child.userData.isISCO)         child.visible = showISCO
    })

    // ── Camera orbit ──────────────────────────────────────────────────────────
    const el      = state.renderer.domElement
    const mouseX  = (params._mouseX  as number) ?? -1
    const mouseY  = (params._mouseY  as number) ?? -1
    const dragging = !!(params._dragging as boolean)
    const zoom    = (params._zoom as number) ?? 1

    let { azimuth, elevation, prevMouseX, prevMouseY } = state

    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      azimuth   -= (mouseX - prevMouseX) / el.width  * Math.PI * 3
      elevation  = clamp(
        elevation + (mouseY - prevMouseY) / el.height * Math.PI,
        -1.4, 1.4,
      )
    }
    prevMouseX = mouseX
    prevMouseY = mouseY

    // Gentle auto-rotate when not dragging
    if (!dragging) {
      azimuth += safeDt * 0.12
    }

    const baseDist = 16
    const d = baseDist / Math.max(0.1, zoom)

    state.camera.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * d,
      Math.sin(elevation) * d,
      Math.cos(azimuth) * Math.cos(elevation) * d,
    )
    state.camera.lookAt(0, 0, 0)

    // ── Accretion disk update ─────────────────────────────────────────────────
    const isKerr = bhType === 'kerr' || bhType === 'kerr-newman'
    const posAttr = state.diskPts.geometry.getAttribute('position') as THREE.BufferAttribute

    for (let i = 0; i < N_DISK; i++) {
      const r = state.diskR[i]
      // Frame dragging: particles closer to EH orbit faster in Kerr spacetime
      const frameDrag = isKerr ? (1 + 0.5 / Math.max(r, 0.01)) : 1.0
      state.diskAngle[i] += state.diskOmega[i] * safeDt * speed * 0.5 * frameDrag

      state.diskPos[i * 3]     = Math.cos(state.diskAngle[i]) * r
      state.diskPos[i * 3 + 2] = Math.sin(state.diskAngle[i]) * r
      // Y (height) stays unchanged — set at init time
    }
    posAttr.needsUpdate = true

    // ── Jet update (Kerr / Kerr-Newman) ───────────────────────────────────────
    const bh    = BH_TABLE[bhType] ?? BH_TABLE['schwarzschild']
    const JET_H = 12
    const r_eh  = bh.ehR

    function advanceJet(pos: Float32Array, t: Float32Array, sign: number): void {
      const attr = (sign > 0 ? state.jetPts1! : state.jetPts2!).geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < N_JET; i++) {
        t[i] += safeDt * speed * 0.4
        if (t[i] > 1) t[i] -= 1
        const ti     = t[i]
        const y      = sign * (r_eh + ti * JET_H)
        const spread = ti * 0.3
        const phi    = Math.atan2(pos[i * 3 + 2], pos[i * 3]) + safeDt * speed * 0.1
        pos[i * 3]     = Math.cos(phi) * spread
        pos[i * 3 + 1] = y
        pos[i * 3 + 2] = Math.sin(phi) * spread
      }
      attr.needsUpdate = true
    }

    if (state.jetPts1 && state.jetPos1 && state.jetT1) {
      advanceJet(state.jetPos1, state.jetT1, +1)
    }
    if (state.jetPts2 && state.jetPos2 && state.jetT2) {
      advanceJet(state.jetPos2, state.jetT2, -1)
    }

    return {
      ...state,
      t:          state.t + safeDt,
      azimuth,
      elevation,
      prevMouseX,
      prevMouseY,
    }
  },

  // ── Render ──────────────────────────────────────────────────────────────────

  render(state, canvas, _params) {
    const el = canvas as HTMLCanvasElement
    const w  = el.width
    const h  = el.height
    if (
      state.renderer.domElement.width  !== w ||
      state.renderer.domElement.height !== h
    ) {
      state.renderer.setSize(w, h, false)
      state.camera.aspect = w / h
      state.camera.updateProjectionMatrix()
    }
    state.renderer.render(state.scene, state.camera)
  },

  // ── Controls ────────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'select',
        id:      'bhType',
        label:   '黑洞类型',
        labelEn: 'Black hole type',
        options: [
          { value: 'schwarzschild', label: '史瓦西（无自旋）',              labelEn: 'Schwarzschild (no spin)' },
          { value: 'kerr',          label: '克尔（自旋 a=0.9）',            labelEn: 'Kerr (spin a=0.9)' },
          { value: 'reissner',      label: '莱斯纳-诺德斯特伦（带电）',     labelEn: 'Reissner-Nordström (charged)' },
          { value: 'kerr-newman',   label: '克尔-纽曼（自旋+带电）',        labelEn: 'Kerr-Newman (spin+charge)' },
        ],
        default: 'schwarzschild',
      },
      {
        type:    'slider',
        id:      'speed',
        label:   '速度',
        labelEn: 'Speed',
        min:     0.1,
        max:     4,
        step:    0.1,
        default: 1,
      },
      {
        type:    'toggle',
        id:      'showPhotonSphere',
        label:   '光子球',
        labelEn: 'Photon sphere',
        default: true,
      },
      {
        type:    'toggle',
        id:      'showISCO',
        label:   'ISCO环',
        labelEn: 'ISCO ring',
        default: true,
      },
    ]
  },

  // ── Destroy ─────────────────────────────────────────────────────────────────

  destroy(canvas) {
    const renderer = rendererStore.get(canvas)
    if (renderer) {
      renderer.dispose()
      rendererStore.delete(canvas)
    }
  },
}

export default SchwarzschildModule

// Space Scale — Universe Log-Axis Scroll Traversal (Plan B)
// Scroll the mouse wheel to travel from neutron star to observable universe.
// 20 objects span 22+ orders of magnitude on a continuous log-scale X axis.
// Objects: stellar, planetary, galactic, cluster, concept.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Object catalogue ───────────────────────────────────────────────────────────
// diamM: actual equatorial diameter in metres

type ObjDef = {
  zh:   string
  en:   string
  diamM: number
  color: number
  kind:  'stellar' | 'planet' | 'system' | 'galaxy' | 'cluster' | 'concept'
}

const CATALOGUE: ObjDef[] = [
  { zh: '中子星',           en: 'Neutron Star',          diamM: 2e4,     color: 0x99CCFF, kind: 'stellar'  },
  { zh: '白矮星',           en: 'White Dwarf',           diamM: 1.2e7,   color: 0xCCDDFF, kind: 'stellar'  },
  { zh: '地球',             en: 'Earth',                 diamM: 1.27e7,  color: 0x3B79F5, kind: 'planet'   },
  { zh: '海王星',           en: 'Neptune',               diamM: 4.95e7,  color: 0x4B70DD, kind: 'planet'   },
  { zh: '木星',             en: 'Jupiter',               diamM: 1.43e8,  color: 0xC88B3A, kind: 'planet'   },
  { zh: '太阳',             en: 'Sun',                   diamM: 1.39e9,  color: 0xFFE040, kind: 'stellar'  },
  { zh: '天狼星 A',         en: 'Sirius A',              diamM: 2.38e9,  color: 0xAADDFF, kind: 'stellar'  },
  { zh: '北河三',           en: 'Pollux',                diamM: 1.22e10, color: 0xFFCC88, kind: 'stellar'  },
  { zh: '大角星',           en: 'Arcturus',              diamM: 3.48e10, color: 0xFF9944, kind: 'stellar'  },
  { zh: '参宿七',           en: 'Rigel',                 diamM: 1.09e11, color: 0xCCEEFF, kind: 'stellar'  },
  { zh: '参宿四',           en: 'Betelgeuse',            diamM: 9.74e11, color: 0xFF4400, kind: 'stellar'  },
  { zh: 'UY Scuti',         en: 'UY Scuti',             diamM: 2.38e12, color: 0xFF2200, kind: 'stellar'  },
  { zh: '太阳系',           en: 'Solar System',          diamM: 9e15,    color: 0xFFEE88, kind: 'system'   },
  { zh: '比邻星距离',        en: 'Nearest Star Dist.',   diamM: 4e16,    color: 0x88AACC, kind: 'concept'  },
  { zh: '猎户座星云',        en: 'Orion Nebula',         diamM: 3e17,    color: 0xFF88BB, kind: 'galaxy'   },
  { zh: '银河系',           en: 'Milky Way',             diamM: 9.46e20, color: 0xAABBFF, kind: 'galaxy'   },
  { zh: '仙女座星系',        en: 'Andromeda (M31)',      diamM: 2.2e21,  color: 0xCCCCFF, kind: 'galaxy'   },
  { zh: '本星系群',         en: 'Local Group',           diamM: 9.5e22,  color: 0xFFDDCC, kind: 'cluster'  },
  { zh: '室女座超星系团',    en: 'Virgo Supercluster',   diamM: 5e24,    color: 0xFFCCAA, kind: 'cluster'  },
  { zh: '可观测宇宙',        en: 'Observable Universe',  diamM: 8.8e26,  color: 0x8866FF, kind: 'concept'  },
]

// ── Log-axis geometry ──────────────────────────────────────────────────────────

const LOG_REF  = 4.0   // reference baseline: log10(min diameter)
const X_SCALE  = 3.0   // scene units per order of magnitude

const OBJ_LOGS = CATALOGUE.map((o) => Math.log10(o.diamM))
const LOG_MIN  = OBJ_LOGS[0]                          // ≈ 4.3  (neutron star)
const LOG_MAX  = OBJ_LOGS[OBJ_LOGS.length - 1]        // ≈ 26.9 (observable universe)

function toX(logD: number): number {
  return (logD - LOG_REF) * X_SCALE
}

/** Visual radius: neutron star ≈ 0.12 → Observable Universe ≈ 6.2 */
function toR(logD: number): number {
  return 0.12 + (logD - LOG_REF) * 0.265
}

/** Human-readable diameter */
function fmtDiam(m: number): string {
  if (m < 1e3)   return `${m.toFixed(0)} m`
  if (m < 1e6)   return `${(m / 1e3).toPrecision(3)} km`
  if (m < 9.46e13) return `${(m / 1.496e11).toPrecision(3)} AU`
  if (m < 9.46e18) return `${(m / 9.461e15).toPrecision(3)} ly`
  if (m < 9.46e21) return `${(m / 9.461e18).toPrecision(3)} kly`
  return `${(m / 9.461e21).toPrecision(3)} Mly`
}

// ── Canvas label sprite ────────────────────────────────────────────────────────

function makeLabelSprite(text: string, subtext: string, col: number): THREE.Sprite {
  const W = 400, H = 80
  const cvs = document.createElement('canvas')
  cvs.width = W; cvs.height = H
  const ctx = cvs.getContext('2d')!
  ctx.clearRect(0, 0, W, H)
  const hex = '#' + col.toString(16).padStart(6, '0')
  ctx.font         = 'bold 34px monospace'
  ctx.fillStyle    = hex
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(text, 4, 4)
  ctx.font      = '22px monospace'
  ctx.fillStyle = 'rgba(240,237,232,0.55)'
  ctx.fillText(subtext, 4, 46)
  const tex = new THREE.CanvasTexture(cvs)
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, opacity: 0.85 })
  const sp  = new THREE.Sprite(mat)
  sp.scale.set((W / H) * 0.6, 0.6, 1)
  return sp
}

// ── State ─────────────────────────────────────────────────────────────────────

type SceneObj = {
  group:  THREE.Group        // parent group at xPos
  logD:   number
  xPosW:  number
  r:      number
  label:  THREE.Sprite
}

type SpaceState = {
  renderer:        THREE.WebGLRenderer
  scene:           THREE.Scene
  camera:          THREE.PerspectiveCamera
  objects:         SceneObj[]
  sunLight:        THREE.PointLight
  unifLog:         number     // current focus position on log axis
  lastScrollAccum: number
  camX:            number     // smoothed camera X
  camZ:            number     // smoothed camera Z
  azimuth:         number     // manual orbit azimuth
  elevation:       number     // orbit elevation
  prevMouseX:      number
  prevMouseY:      number
  autoAngle:       number     // auto-rotate angle
  focusIdx:        number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Scene builders ─────────────────────────────────────────────────────────────

function bgStars(): THREE.Points {
  const N = 2500; const pos = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const phi = Math.random() * Math.PI * 2
    const ct  = Math.random() * 2 - 1
    const st  = Math.sqrt(1 - ct * ct)
    const r   = 220 + Math.random() * 60
    pos[i*3] = r*st*Math.cos(phi); pos[i*3+1] = r*ct; pos[i*3+2] = r*st*Math.sin(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.45, sizeAttenuation: true }))
}

function makeGlowSphere(r: number, color: number): THREE.Group {
  const g   = new THREE.Group()
  const segs = r > 0.6 ? 48 : r > 0.2 ? 32 : 18
  // Core
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.04, r), segs, Math.ceil(segs / 2)),
    new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 0.55, roughness: 0.65,
    }),
  ))
  // Halo
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(Math.max(0.05, r * 1.2), 16, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, side: THREE.BackSide }),
  ))
  return g
}

function makeGalaxyCloud(r: number, color: number, nPts: number): THREE.Points {
  const pos = new Float32Array(nPts * 3)
  const col = new Float32Array(nPts * 3)
  const c   = new THREE.Color(color)
  for (let i = 0; i < nPts; i++) {
    const arm   = Math.floor(Math.random() * 3)
    const t     = Math.random()
    const ang   = (arm / 3) * Math.PI * 2 + t * Math.PI * 2.3 + (Math.random() - .5) * 0.45
    const ri    = r * (0.04 + t * 0.96)
    const h     = (Math.random() - .5) * r * 0.07
    pos[i*3] = Math.cos(ang)*ri; pos[i*3+1] = h; pos[i*3+2] = Math.sin(ang)*ri
    const br = (0.25 + 0.55 * Math.random()) * (0.6 + 0.4 * (1 - t))
    col[i*3] = c.r*br; col[i*3+1] = c.g*br; col[i*3+2] = c.b*br
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: Math.max(0.04, r * 0.022), vertexColors: true, sizeAttenuation: true,
    transparent: true, opacity: 0.85,
  }))
}

function makeClusterCloud(r: number, color: number, nPts: number): THREE.Points {
  const pos = new Float32Array(nPts * 3)
  const col = new Float32Array(nPts * 3)
  const c   = new THREE.Color(color)
  for (let i = 0; i < nPts; i++) {
    const phi = Math.random() * Math.PI * 2
    const ct  = Math.random() * 2 - 1
    const st  = Math.sqrt(1 - ct * ct)
    const ri  = r * Math.pow(Math.random(), 0.42)
    pos[i*3] = ri*st*Math.cos(phi); pos[i*3+1] = ri*ct; pos[i*3+2] = ri*st*Math.sin(phi)
    const br = (0.2 + 0.45 * Math.random()) * Math.max(0, 1 - ri / r * 0.65)
    col[i*3] = c.r*br; col[i*3+1] = c.g*br; col[i*3+2] = c.b*br
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: Math.max(0.04, r * 0.018), vertexColors: true, sizeAttenuation: true,
    transparent: true, opacity: 0.70,
  }))
}

function makeConceptSphere(r: number, color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(r, 24, 12),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.28 }),
  )
}

function buildAxisLine(): THREE.Line {
  const xMin = toX(LOG_MIN) - 3
  const xMax = toX(LOG_MAX) + 3
  const geo  = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(xMin, 0, 0),
    new THREE.Vector3(xMax, 0, 0),
  ])
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x1a2a3a, transparent: true, opacity: 0.5 }))
}

function buildAllObjects(lang: string): SceneObj[] {
  return CATALOGUE.map((def, i) => {
    const logD  = OBJ_LOGS[i]
    const xPosW = toX(logD)
    const r     = toR(logD)

    const group = new THREE.Group()
    group.position.x = xPosW

    let body: THREE.Object3D
    switch (def.kind) {
      case 'galaxy':
        body = makeGalaxyCloud(r, def.color, Math.min(8000, Math.round(3000 + r * 800)))
        break
      case 'cluster':
        body = makeClusterCloud(r, def.color, Math.min(5000, Math.round(2000 + r * 200)))
        break
      case 'concept':
        body = makeConceptSphere(r, def.color)
        break
      default:
        body = makeGlowSphere(r, def.color)
        break
    }
    group.add(body)

    // Label sprite above the object
    const labelText  = lang === 'en' ? def.en : def.zh
    const sizeText   = fmtDiam(def.diamM)
    const label      = makeLabelSprite(labelText, sizeText, def.color)
    label.position.y = r * 1.35 + 0.22
    group.add(label)

    return { group, logD, xPosW, r, label }
  })
}

// ── Module ────────────────────────────────────────────────────────────────────

const SpaceScaleModule: PhysicsModule<SpaceState> = {
  id: 'space-scale',

  metadata: {
    title:         '宇宙尺度',
    titleEn:       'Scale of the Universe',
    description:   '滚动鼠标滑轮，从中子星到可观测宇宙——跨越22个数量级的宇宙之旅。',
    descriptionEn: 'Scroll to travel from a neutron star to the observable universe — 22 orders of magnitude.',
    theory:        ['astrophysics', 'general-relativity'],
    mathLevel:     1,
    renderer:      'threejs',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(canvas, params): SpaceState {
    const el   = canvas as HTMLCanvasElement
    const lang = (params._lang as string) ?? 'zh'

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x000008)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.25))

    // Point light near sun (index 5)
    const sunLight = new THREE.PointLight(0xFFE040, 3.0, 50)
    const sunX     = toX(OBJ_LOGS[5])
    sunLight.position.set(sunX, 0, 0)
    scene.add(sunLight)

    scene.add(bgStars())
    scene.add(buildAxisLine())

    const objects = buildAllObjects(lang)
    objects.forEach((o) => scene.add(o.group))

    // Start at the Sun (index 5)
    const startIdx = 5
    const startLog = OBJ_LOGS[startIdx]
    const startX   = toX(startLog)
    const startZ   = toR(startLog) * 5.5

    const camera = new THREE.PerspectiveCamera(50, el.width / el.height, 0.001, 800)
    camera.position.set(startX, 0, startZ)
    camera.lookAt(startX, 0, 0)

    return {
      renderer, scene, camera, objects, sunLight,
      unifLog:         startLog,
      lastScrollAccum: 0,
      camX:            startX,
      camZ:            startZ,
      azimuth:         0,
      elevation:       0,
      prevMouseX:      -1,
      prevMouseY:      -1,
      autoAngle:       0,
      focusIdx:        startIdx,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): SpaceState {
    const scrollAccum = (params._scrollAccum as number)  ?? 0
    const scrollSpeed = (params.scrollSpeed  as number)  ?? 1
    const autoRotate  = (params.autoRotate   as boolean) ?? true
    const mouseX      = (params._mouseX      as number)  ?? -1
    const mouseY      = (params._mouseY      as number)  ?? -1
    const dragging    = (params._dragging    as boolean) ?? false
    const zoom        = (params._zoom        as number)  ?? 1

    // ── Universe log position from scroll ──────────────────────────────────
    const scrollDelta = scrollAccum - state.lastScrollAccum
    let unifLog = state.unifLog + scrollDelta * 0.0015 * scrollSpeed
    unifLog = Math.max(LOG_MIN, Math.min(LOG_MAX, unifLog))

    // ── Find focused object ─────────────────────────────────────────────────
    let focusIdx = 0; let bestDist = Infinity
    for (let i = 0; i < OBJ_LOGS.length; i++) {
      const d = Math.abs(OBJ_LOGS[i] - unifLog)
      if (d < bestDist) { bestDist = d; focusIdx = i }
    }

    // ── Camera target ───────────────────────────────────────────────────────
    const focusX   = toX(unifLog)
    const focusR   = toR(unifLog)
    const targetZ  = (focusR * 5.5) / Math.max(0.3, zoom)

    const SMOOTH = Math.min(1, dt * 4.5)
    const camX   = state.camX + (focusX - state.camX) * SMOOTH
    const camZ   = state.camZ + (targetZ - state.camZ) * SMOOTH

    // ── Mouse orbit ─────────────────────────────────────────────────────────
    let { azimuth, elevation, prevMouseX, prevMouseY, autoAngle } = state

    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      const el = state.renderer.domElement
      azimuth    -= ((mouseX - prevMouseX) / el.width)  * Math.PI * 2.5
      elevation   = Math.max(-0.55, Math.min(0.55,
        elevation + ((mouseY - prevMouseY) / el.height) * 2.0))
    }
    prevMouseX = mouseX; prevMouseY = mouseY

    if (!dragging && autoRotate) autoAngle += dt * 0.18

    // ── Position camera ─────────────────────────────────────────────────────
    const totalAz  = azimuth + autoAngle
    const camYPos  = camZ * Math.sin(elevation)
    const camZH    = camZ * Math.cos(elevation)
    state.camera.position.set(
      camX + Math.sin(totalAz) * camZH,
      camYPos,
      Math.cos(totalAz) * camZH,
    )
    state.camera.lookAt(camX, 0, 0)

    // ── Object visibility & label opacity by log-distance ──────────────────
    for (let i = 0; i < state.objects.length; i++) {
      const o      = state.objects[i]
      const dist   = Math.abs(OBJ_LOGS[i] - unifLog)
      // Show objects within ±4 decades of current focus
      o.group.visible = dist < 4.5
      if (o.group.visible) {
        const labelOp = i === focusIdx
          ? 0.95
          : Math.max(0, 1 - dist / 4)
        const labelMat = o.label.material as THREE.SpriteMaterial
        labelMat.opacity = labelOp
      }
    }

    // ── Gently pulse the focused object ────────────────────────────────────
    const focusGroup = state.objects[focusIdx]?.group
    if (focusGroup) {
      const pulse = 1 + Math.sin(state.unifLog * 120 + Date.now() * 0.002) * 0.015
      focusGroup.scale.setScalar(pulse)
    }

    // Reset pulse scale on previously focused objects
    for (let i = 0; i < state.objects.length; i++) {
      if (i !== focusIdx) state.objects[i].group.scale.setScalar(1)
    }

    return {
      ...state,
      unifLog,
      lastScrollAccum: scrollAccum,
      camX, camZ,
      azimuth, elevation,
      prevMouseX, prevMouseY,
      autoAngle,
      focusIdx,
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
        id:      'scrollSpeed',
        label:   '滚轮灵敏度',
        labelEn: 'Scroll sensitivity',
        min:     0.2,
        max:     3.0,
        step:    0.1,
        default: 1.0,
      },
      {
        type:    'toggle',
        id:      'autoRotate',
        label:   '自动旋转',
        labelEn: 'Auto-rotate',
        default: true,
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

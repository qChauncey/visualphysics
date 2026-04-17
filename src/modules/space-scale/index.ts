// Space Scale — Powers-of-Ten Universe Zoom
// Scroll to travel through 22 orders of magnitude: neutron star → observable universe.
// Every object scales dynamically: worldRadius = diamM / (2 × 10^logScale).
// At any logScale only objects of similar size are visible; others fade to nothing.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Catalogue ─────────────────────────────────────────────────────────────────

type ObjDef = {
  zh:    string
  en:    string
  diamM: number
  color: number
  kind:  'stellar' | 'planet' | 'system' | 'galaxy' | 'cluster' | 'concept'
  ring?: boolean
}

const CATALOGUE: ObjDef[] = [
  { zh: '中子星',         en: 'Neutron Star',        diamM: 2e4,     color: 0x99CCFF, kind: 'stellar'  },
  { zh: '白矮星',         en: 'White Dwarf',          diamM: 1.2e7,   color: 0xCCDDFF, kind: 'stellar'  },
  { zh: '地球',           en: 'Earth',                diamM: 1.27e7,  color: 0x3B79F5, kind: 'planet'   },
  { zh: '海王星',         en: 'Neptune',              diamM: 4.95e7,  color: 0x4B70DD, kind: 'planet'   },
  { zh: '木星',           en: 'Jupiter',              diamM: 1.43e8,  color: 0xC88B3A, kind: 'planet'   },
  { zh: '土星',           en: 'Saturn',               diamM: 1.21e8,  color: 0xE8D5A3, kind: 'planet',  ring: true },
  { zh: '太阳',           en: 'Sun',                  diamM: 1.39e9,  color: 0xFFE040, kind: 'stellar'  },
  { zh: '天狼星 A',       en: 'Sirius A',             diamM: 2.38e9,  color: 0xAADDFF, kind: 'stellar'  },
  { zh: '北河三',         en: 'Pollux',               diamM: 1.22e10, color: 0xFFCC88, kind: 'stellar'  },
  { zh: '大角星',         en: 'Arcturus',             diamM: 3.48e10, color: 0xFF9944, kind: 'stellar'  },
  { zh: '参宿七',         en: 'Rigel',                diamM: 1.09e11, color: 0xCCEEFF, kind: 'stellar'  },
  { zh: '参宿四',         en: 'Betelgeuse',           diamM: 9.74e11, color: 0xFF4400, kind: 'stellar'  },
  { zh: 'UY Scuti',       en: 'UY Scuti',             diamM: 2.38e12, color: 0xFF2200, kind: 'stellar'  },
  { zh: '太阳系',         en: 'Solar System',         diamM: 9e15,    color: 0xFFEE88, kind: 'system'   },
  { zh: '比邻星距离',     en: 'Proxima Distance',     diamM: 4e16,    color: 0x88AACC, kind: 'concept'  },
  { zh: '猎户座星云',     en: 'Orion Nebula',         diamM: 3e17,    color: 0xFF88BB, kind: 'galaxy'   },
  { zh: '银河系',         en: 'Milky Way',            diamM: 9.46e20, color: 0xAABBFF, kind: 'galaxy'   },
  { zh: '仙女座星系',     en: 'Andromeda (M31)',      diamM: 2.2e21,  color: 0xCCCCFF, kind: 'galaxy'   },
  { zh: '本星系群',       en: 'Local Group',          diamM: 9.5e22,  color: 0xFFDDCC, kind: 'cluster'  },
  { zh: '室女座超星系团', en: 'Virgo Supercluster',   diamM: 5e24,    color: 0xFFCCAA, kind: 'cluster'  },
  { zh: '可观测宇宙',     en: 'Observable Universe',  diamM: 8.8e26,  color: 0x8866FF, kind: 'concept'  },
]

// Fixed 3D positions (world units). Objects at the same natural scale are spread apart
// so multiple visible objects at the same zoom level appear in different directions.
const POSITIONS: [number, number, number][] = [
  [ 0,  0,  0],  // 0  Neutron Star     (alone at its scale)
  [-4,  2,  1],  // 1  White Dwarf
  [ 0,  0,  0],  // 2  Earth            (center of planet group)
  [ 5,  0, -3],  // 3  Neptune
  [-5,  1,  2],  // 4  Jupiter
  [ 3, -2,  4],  // 5  Saturn
  [ 0,  0,  0],  // 6  Sun              (center of star group)
  [ 6,  2, -3],  // 7  Sirius A
  [-5, -2,  3],  // 8  Pollux
  [ 0,  0,  0],  // 9  Arcturus         (center of giant-star group)
  [ 5,  3, -2],  // 10 Rigel
  [-4, -3,  3],  // 11 Betelgeuse
  [ 0,  0,  0],  // 12 UY Scuti        (alone at its scale)
  [ 0,  0,  0],  // 13 Solar System    (alone at its scale)
  [ 6, -2,  3],  // 14 Proxima Distance
  [ 0,  0,  0],  // 15 Orion Nebula
  [ 0,  0,  0],  // 16 Milky Way       (center of galaxy group)
  [ 7,  3, -4],  // 17 Andromeda
  [ 0,  0,  0],  // 18 Local Group
  [ 5, -2,  3],  // 19 Virgo Supercluster
  [ 0,  0,  0],  // 20 Observable Universe
]

// log10(diamM / 5): the logScale at which this object fills ~35% of the viewport
function naturalLog(diamM: number): number { return Math.log10(diamM / 5) }

const LOG_MIN = naturalLog(CATALOGUE[0].diamM)   // ≈ 3.6
const LOG_MAX = naturalLog(CATALOGUE[20].diamM)  // ≈ 26.2

// HUD canvas resolution (independent of screen size)
const HUD_W = 1280, HUD_H = 720
// Camera orbit distance from focus target
const CAM_DIST = 15

// ── Format helpers ─────────────────────────────────────────────────────────────

function fmtDiam(m: number): string {
  if (m < 1e3)     return `${m.toFixed(0)} m`
  if (m < 1e6)     return `${(m / 1e3).toPrecision(3)} km`
  if (m < 9.46e13) return `${(m / 1.496e11).toPrecision(3)} AU`
  if (m < 9.46e18) return `${(m / 9.461e15).toPrecision(3)} ly`
  if (m < 9.46e21) return `${(m / 9.461e18).toPrecision(3)} kly`
  return `${(m / 9.461e21).toPrecision(3)} Mly`
}

function fmtScale(metersPerUnit: number): string {
  // Returns a label for "1 world unit = X"
  const m = metersPerUnit
  if (m < 1)       return `${m.toExponential(2)} m`
  if (m < 1e3)     return `${m.toFixed(1)} m`
  if (m < 1e6)     return `${(m / 1e3).toPrecision(3)} km`
  if (m < 1e9)     return `${(m / 1e6).toPrecision(3)} Mm`
  if (m < 1.496e13) return `${(m / 1.496e11).toPrecision(3)} AU`
  if (m < 9.461e18) return `${(m / 9.461e15).toPrecision(3)} ly`
  if (m < 9.461e21) return `${(m / 9.461e18).toPrecision(3)} kly`
  return `${(m / 9.461e21).toPrecision(3)} Mly`
}

// ── Object builders (unit-normalised: radius = 1 in local space) ──────────────

function makeGlowSphere(color: number): THREE.Group {
  const g = new THREE.Group()
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 24),
    new THREE.MeshStandardMaterial({
      color, emissive: new THREE.Color(color), emissiveIntensity: 0.55, roughness: 0.6,
    }),
  ))
  // Soft halo
  g.add(new THREE.Mesh(
    new THREE.SphereGeometry(1.25, 16, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.06, side: THREE.BackSide }),
  ))
  return g
}

function makeRings(color: number): THREE.Mesh {
  const geo = new THREE.RingGeometry(1.3, 2.4, 80)
  geo.rotateX(Math.PI / 2)
  // Tilt rings slightly so they're visible from above
  geo.rotateZ(0.4)
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity: 0.45, side: THREE.DoubleSide,
  }))
}

function makeGalaxyCloud(color: number, nPts: number): THREE.Points {
  const pos = new Float32Array(nPts * 3)
  const col = new Float32Array(nPts * 3)
  const c   = new THREE.Color(color)
  for (let i = 0; i < nPts; i++) {
    const arm = Math.floor(Math.random() * 3)
    const t   = Math.random()
    const ang = (arm / 3) * Math.PI * 2 + t * Math.PI * 2.3 + (Math.random() - .5) * 0.45
    const ri  = 0.04 + t * 0.96
    const h   = (Math.random() - .5) * 0.07
    pos[i*3]   = Math.cos(ang) * ri
    pos[i*3+1] = h
    pos[i*3+2] = Math.sin(ang) * ri
    const br = (0.25 + 0.55 * Math.random()) * (0.6 + 0.4 * (1 - t))
    col[i*3] = c.r * br; col[i*3+1] = c.g * br; col[i*3+2] = c.b * br
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.022, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.88,
  }))
}

function makeClusterCloud(color: number, nPts: number): THREE.Points {
  const pos = new Float32Array(nPts * 3)
  const col = new Float32Array(nPts * 3)
  const c   = new THREE.Color(color)
  for (let i = 0; i < nPts; i++) {
    const phi = Math.random() * Math.PI * 2
    const ct  = Math.random() * 2 - 1
    const st  = Math.sqrt(1 - ct * ct)
    const ri  = Math.pow(Math.random(), 0.42)
    pos[i*3]   = ri * st * Math.cos(phi)
    pos[i*3+1] = ri * ct
    pos[i*3+2] = ri * st * Math.sin(phi)
    const br = (0.2 + 0.45 * Math.random()) * Math.max(0, 1 - ri * 0.65)
    col[i*3] = c.r * br; col[i*3+1] = c.g * br; col[i*3+2] = c.b * br
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.018, vertexColors: true, sizeAttenuation: true, transparent: true, opacity: 0.70,
  }))
}

function makeConceptSphere(color: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 16),
    new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.22 }),
  )
}

function collectMaterials(obj: THREE.Object3D): THREE.Material[] {
  const mats: THREE.Material[] = []
  obj.traverse(child => {
    const mesh = child as THREE.Mesh
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mats.push(...mesh.material)
      else mats.push(mesh.material)
    }
  })
  return mats
}

function bgStars(): THREE.Points {
  const N = 3500
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) {
    const phi = Math.random() * Math.PI * 2
    const ct  = Math.random() * 2 - 1
    const st  = Math.sqrt(1 - ct * ct)
    const r   = 180 + Math.random() * 60
    pos[i*3]   = r * st * Math.cos(phi)
    pos[i*3+1] = r * ct
    pos[i*3+2] = r * st * Math.sin(phi)
    // Slight colour variation
    const warm = Math.random()
    col[i*3] = 0.8 + warm * 0.2; col[i*3+1] = 0.85 + warm * 0.1; col[i*3+2] = 1.0
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))
  return new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.32, vertexColors: true, sizeAttenuation: true,
  }))
}

// ── HUD drawing ───────────────────────────────────────────────────────────────

function drawHUD(
  ctx:      CanvasRenderingContext2D,
  logScale: number,
  focusIdx: number,
  lang:     string,
) {
  const W = ctx.canvas.width, H = ctx.canvas.height
  ctx.clearRect(0, 0, W, H)

  const def    = CATALOGUE[focusIdx]
  const mpu    = Math.pow(10, logScale)
  const hex    = '#' + def.color.toString(16).padStart(6, '0')
  const name   = lang === 'en' ? def.en : def.zh
  const isZh   = lang !== 'en'

  // ── Focus object label (top-left) ─────────────────────────────────────────
  ctx.font      = 'bold 30px monospace'
  ctx.fillStyle = hex
  ctx.fillText(name, 32, 56)
  ctx.font      = '19px monospace'
  ctx.fillStyle = 'rgba(240,237,232,0.52)'
  ctx.fillText(`⌀ ${fmtDiam(def.diamM)}`, 32, 84)

  // ── Progress bar ──────────────────────────────────────────────────────────
  const progress = Math.max(0, Math.min(1, (logScale - LOG_MIN) / (LOG_MAX - LOG_MIN)))
  const bx = 32, by = 102, bW = 280, bH = 5
  ctx.fillStyle = 'rgba(240,237,232,0.10)'
  ctx.fillRect(bx, by, bW, bH)
  ctx.fillStyle = hex
  ctx.fillRect(bx, by, bW * progress, bH)
  // tick marks for each "decade transition" object
  for (let i = 0; i < CATALOGUE.length; i++) {
    const p = (naturalLog(CATALOGUE[i].diamM) - LOG_MIN) / (LOG_MAX - LOG_MIN)
    ctx.fillStyle = 'rgba(240,237,232,0.22)'
    ctx.fillRect(bx + bW * p - 0.5, by - 2, 1, bH + 4)
  }
  ctx.font      = '12px monospace'
  ctx.fillStyle = 'rgba(240,237,232,0.30)'
  ctx.fillText(`10^${logScale.toFixed(1)} m`, bx, by + bH + 16)

  // ── Scale bar (bottom-left) ───────────────────────────────────────────────
  // Bar represents 5 world units at the current scale
  const barMeters = mpu * 5
  const sbW = 220, sbX = 32, sbY = H - 52
  ctx.strokeStyle = 'rgba(200,149,90,0.60)'
  ctx.lineWidth   = 2
  ctx.beginPath()
  ctx.moveTo(sbX,       sbY); ctx.lineTo(sbX + sbW, sbY)
  ctx.moveTo(sbX,       sbY - 7); ctx.lineTo(sbX,       sbY + 7)
  ctx.moveTo(sbX + sbW, sbY - 7); ctx.lineTo(sbX + sbW, sbY + 7)
  ctx.stroke()
  ctx.font      = '16px monospace'
  ctx.fillStyle = 'rgba(240,237,232,0.60)'
  ctx.fillText(`5 units = ${fmtScale(barMeters)}`, sbX, sbY + 24)

  // ── Scale exponent (bottom-right) ─────────────────────────────────────────
  ctx.font      = '15px monospace'
  ctx.fillStyle = 'rgba(240,237,232,0.25)'
  ctx.textAlign = 'right'
  ctx.fillText(`1 unit = ${fmtScale(mpu)}`, W - 32, H - 28)
  ctx.textAlign = 'left'

  // ── Navigation hint (bottom-centre) ───────────────────────────────────────
  ctx.font      = '13px monospace'
  ctx.fillStyle = 'rgba(240,237,232,0.18)'
  ctx.textAlign = 'center'
  ctx.fillText(
    isZh ? '滚轮缩放 · 拖拽旋转' : 'scroll to zoom · drag to orbit',
    W / 2, H - 20,
  )
  ctx.textAlign = 'left'
}

// ── State ─────────────────────────────────────────────────────────────────────

type SceneObj = {
  group:     THREE.Group
  materials: THREE.Material[]
  def:       ObjDef
  idx:       number
}

type SpaceState = {
  renderer:        THREE.WebGLRenderer
  scene:           THREE.Scene
  camera:          THREE.PerspectiveCamera
  hudScene:        THREE.Scene
  hudCamera:       THREE.OrthographicCamera
  hudCanvas:       HTMLCanvasElement
  hudTex:          THREE.CanvasTexture
  objects:         SceneObj[]
  sunLight:        THREE.PointLight
  logScale:        number
  lastScrollAccum: number
  // Camera target (smooth-tracked to POSITIONS[focusIdx])
  tgtX:            number
  tgtY:            number
  tgtZ:            number
  azimuth:         number
  elevation:       number
  autoAngle:       number
  prevMouseX:      number
  prevMouseY:      number
  focusIdx:        number
  // Jump-to animation
  jumpLog:         number | null
  lastTargetObj:   string
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Module ────────────────────────────────────────────────────────────────────

const SpaceScaleModule: PhysicsModule<SpaceState> = {
  id: 'space-scale',

  metadata: {
    title:         '宇宙尺度',
    titleEn:       'Scale of the Universe',
    description:   '滚动鼠标滑轮，从中子星到可观测宇宙——跨越22个数量级的宇宙之旅。',
    descriptionEn: 'Scroll to zoom through 22 orders of magnitude: from a neutron star to the observable universe.',
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
    renderer.autoClear = false
    rendererStore.set(canvas, renderer)

    // ── Main scene ──────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.add(new THREE.AmbientLight(0xffffff, 0.20))
    const sunLight = new THREE.PointLight(0xFFE848, 4.0, 80)
    scene.add(sunLight)
    scene.add(bgStars())

    // ── Build objects ───────────────────────────────────────────────────────
    const objects: SceneObj[] = CATALOGUE.map((def, idx) => {
      const group = new THREE.Group()
      group.position.set(...POSITIONS[idx])

      let body: THREE.Object3D
      switch (def.kind) {
        case 'galaxy':
          body = makeGalaxyCloud(def.color, idx === 16 ? 10000 : 6000)
          break
        case 'cluster':
          body = makeClusterCloud(def.color, 4000)
          break
        case 'concept':
          body = makeConceptSphere(def.color)
          break
        default:
          body = makeGlowSphere(def.color)
          break
      }
      group.add(body)
      if (def.ring) group.add(makeRings(def.color))

      // Label sprite at y=1.55 in local space (just above the unit sphere)
      const lW = 420, lH = 82
      const lCvs = document.createElement('canvas')
      lCvs.width = lW; lCvs.height = lH
      const lCtx = lCvs.getContext('2d')!
      lCtx.font         = 'bold 34px monospace'
      lCtx.fillStyle    = '#' + def.color.toString(16).padStart(6, '0')
      lCtx.textBaseline = 'top'
      lCtx.fillText(lang === 'en' ? def.en : def.zh, 4, 4)
      lCtx.font      = '22px monospace'
      lCtx.fillStyle = 'rgba(240,237,232,0.52)'
      lCtx.fillText(fmtDiam(def.diamM), 4, 46)
      const lTex = new THREE.CanvasTexture(lCvs)
      const lSp  = new THREE.Sprite(new THREE.SpriteMaterial({
        map: lTex, transparent: true, depthTest: false, opacity: 0,
      }))
      lSp.scale.set((lW / lH) * 0.65, 0.65, 1)
      lSp.position.set(0, 1.55, 0)
      group.add(lSp)

      scene.add(group)
      return { group, materials: collectMaterials(group), def, idx }
    })

    // ── HUD scene ────────────────────────────────────────────────────────────
    const hudScene  = new THREE.Scene()
    const hudCamera = new THREE.OrthographicCamera(0, HUD_W, HUD_H, 0, -1, 1)

    const hudCanvas = document.createElement('canvas')
    hudCanvas.width = HUD_W; hudCanvas.height = HUD_H
    const hudTex = new THREE.CanvasTexture(hudCanvas)
    const hudSp  = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: hudTex, transparent: true, depthTest: false }),
    )
    hudSp.scale.set(HUD_W, HUD_H, 1)
    hudSp.position.set(HUD_W / 2, HUD_H / 2, 0)
    hudScene.add(hudSp)

    // ── Camera ───────────────────────────────────────────────────────────────
    const startLog = naturalLog(CATALOGUE[6].diamM) // Sun
    const camera   = new THREE.PerspectiveCamera(50, el.width / el.height, 0.001, 1000)
    camera.position.set(0, 2, CAM_DIST)
    camera.lookAt(0, 0, 0)

    return {
      renderer, scene, camera, hudScene, hudCamera, hudCanvas, hudTex,
      objects, sunLight,
      logScale:        startLog,
      lastScrollAccum: 0,
      tgtX: 0, tgtY: 0, tgtZ: 0,
      azimuth:   0,
      elevation: 0.12,
      autoAngle: 0,
      prevMouseX: -1,
      prevMouseY: -1,
      focusIdx:   6,
      jumpLog:    null,
      lastTargetObj: '',
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): SpaceState {
    const scrollAccum = (params._scrollAccum as number)  ?? 0
    const scrollSpeed = (params.scrollSpeed  as number)  ?? 1.0
    const autoRotate  = (params.autoRotate   as boolean) ?? true
    const mouseX      = (params._mouseX      as number)  ?? -1
    const mouseY      = (params._mouseY      as number)  ?? -1
    const dragging    = (params._dragging    as boolean) ?? false
    const lang        = (params._lang        as string)  ?? 'zh'
    const targetObj   = (params.targetObject as string)  ?? ''

    // ── Jump-to: detect param change ──────────────────────────────────────
    let { jumpLog, lastTargetObj } = state
    if (targetObj !== lastTargetObj) {
      lastTargetObj = targetObj
      const idx = CATALOGUE.findIndex(d => d.en === targetObj)
      if (idx >= 0) jumpLog = naturalLog(CATALOGUE[idx].diamM)
    }

    // ── Advance log scale ─────────────────────────────────────────────────
    const scrollDelta = scrollAccum - state.lastScrollAccum
    let logScale = state.logScale

    if (Math.abs(scrollDelta) > 0) {
      logScale += scrollDelta * 0.002 * scrollSpeed
      jumpLog   = null  // user scroll cancels jump
    } else if (jumpLog !== null) {
      logScale += (jumpLog - logScale) * Math.min(1, dt * 3.5)
      if (Math.abs(logScale - jumpLog) < 0.03) jumpLog = null
    }
    logScale = Math.max(LOG_MIN - 0.3, Math.min(LOG_MAX + 0.3, logScale))

    // ── Find focused object ───────────────────────────────────────────────
    const mpu = Math.pow(10, logScale)
    let focusIdx = 0, bestDist = Infinity
    for (let i = 0; i < CATALOGUE.length; i++) {
      const wr   = CATALOGUE[i].diamM / (2 * mpu)
      const dist = Math.abs(Math.log10(wr) - Math.log10(2.5))
      if (dist < bestDist) { bestDist = dist; focusIdx = i }
    }

    // ── Smooth camera target toward focus object position ─────────────────
    const fp     = POSITIONS[focusIdx]
    const S      = Math.min(1, dt * 4)
    const tgtX   = state.tgtX + (fp[0] - state.tgtX) * S
    const tgtY   = state.tgtY + (fp[1] - state.tgtY) * S
    const tgtZ   = state.tgtZ + (fp[2] - state.tgtZ) * S

    // ── Mouse orbit ───────────────────────────────────────────────────────
    let { azimuth, elevation, prevMouseX, prevMouseY, autoAngle } = state
    if (dragging && prevMouseX >= 0 && mouseX >= 0) {
      const el = state.renderer.domElement
      azimuth   -= ((mouseX - prevMouseX) / el.width)  * Math.PI * 2.5
      elevation  = Math.max(-0.6, Math.min(0.7,
        elevation + ((mouseY - prevMouseY) / el.height) * 2.0))
    }
    prevMouseX = mouseX; prevMouseY = mouseY
    if (!dragging && autoRotate) autoAngle += dt * 0.15

    const totalAz = azimuth + autoAngle
    const cosEl   = Math.cos(elevation)
    state.camera.position.set(
      tgtX + Math.sin(totalAz) * cosEl * CAM_DIST,
      tgtY + Math.sin(elevation) * CAM_DIST,
      tgtZ + Math.cos(totalAz) * cosEl * CAM_DIST,
    )
    state.camera.lookAt(tgtX, tgtY, tgtZ)

    // ── Move sun light with Sun object ────────────────────────────────────
    const sunWR = CATALOGUE[6].diamM / (2 * mpu)
    if (sunWR > 0.03 && sunWR < 50) {
      const sp = POSITIONS[6]
      state.sunLight.position.set(sp[0], sp[1], sp[2])
      state.sunLight.intensity = Math.min(4, sunWR * 0.8)
    } else {
      state.sunLight.intensity = 0
    }

    // ── Scale + fade every object ─────────────────────────────────────────
    const time = Date.now() * 0.001
    for (const obj of state.objects) {
      const wr = obj.def.diamM / (2 * mpu)

      // Opacity: fully visible 0.08–9, fades outside that window
      let opacity: number
      if      (wr < 0.03)  opacity = 0
      else if (wr < 0.08)  opacity = (wr - 0.03) / 0.05
      else if (wr < 9)     opacity = 1
      else if (wr < 13)    opacity = (13 - wr) / 4
      else                 opacity = 0

      obj.group.visible = opacity > 0.01

      if (obj.group.visible) {
        // Scale group so radius = wr world units
        const pulse = obj.idx === focusIdx
          ? 1 + Math.sin(time * 1.8) * 0.012
          : 1
        obj.group.scale.setScalar(wr * pulse)

        // Body materials (skip sprite label)
        for (const mat of obj.materials) {
          if (mat instanceof THREE.SpriteMaterial) continue
          mat.transparent = true
          mat.opacity = opacity
        }

        // Label sprite: shown when object is large enough to identify
        const label = obj.group.children[obj.group.children.length - 1] as THREE.Sprite
        if (label instanceof THREE.Sprite) {
          const lMat = label.material as THREE.SpriteMaterial
          const labelOp = obj.idx === focusIdx
            ? Math.min(1, (wr - 0.5) / 1.0) * opacity
            : Math.min(1, (wr - 1.5) / 1.5) * opacity * 0.55
          lMat.opacity = Math.max(0, labelOp)
        }
      }
    }

    // ── Update HUD ────────────────────────────────────────────────────────
    const hudCtx = state.hudCanvas.getContext('2d')!
    drawHUD(hudCtx, logScale, focusIdx, lang)
    state.hudTex.needsUpdate = true

    return {
      ...state,
      logScale,
      lastScrollAccum: scrollAccum,
      tgtX, tgtY, tgtZ,
      azimuth, elevation, autoAngle,
      prevMouseX, prevMouseY,
      focusIdx,
      jumpLog,
      lastTargetObj,
    }
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
    state.renderer.clear()
    state.renderer.render(state.scene, state.camera)
    // HUD on top (no depth clear between passes)
    state.renderer.clearDepth()
    state.renderer.render(state.hudScene, state.hudCamera)
  },

  // ── Controls ──────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'select',
        id:      'targetObject',
        label:   '跳转至',
        labelEn: 'Jump to',
        default: '',
        options: [
          { value: '', label: '自由探索', labelEn: 'Free explore' },
          ...CATALOGUE.map(d => ({ value: d.en, label: d.zh, labelEn: d.en })),
        ],
      },
      {
        type:    'slider',
        id:      'scrollSpeed',
        label:   '滚轮灵敏度',
        labelEn: 'Scroll sensitivity',
        min: 0.2, max: 3.0, step: 0.1, default: 1.0,
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

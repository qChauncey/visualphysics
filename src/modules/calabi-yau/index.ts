// Calabi-Yau Manifold — Three.js parametric surface visualization
//
// Renders the classic "quintic" Calabi-Yau cross-section that appears in
// popular string-theory illustrations. For integer n, we sample n² patches
// of the surface z1^n + z2^n = 1 in C², projecting a 2D slice to 3D.
//
// Parametrisation (per patch k1, k2 ∈ {0,…,n-1}):
//   α  ∈ [0, π/2],  β ∈ [0, 2π]
//   z1 = e^(2πi k1/n) · cos(α)^(2/n)  (complex n-th root)
//   z2 = e^(2πi k2/n) · sin(α)^(2/n)
//   x  = Re(z1),  y  = Re(z2),  z = Im(z1)  (project 4D→3D)
// The surface is rendered with smooth normals and coloured by height.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Helpers ───────────────────────────────────────────────────────────────

/** Complex power: (re + i·im)^p  (p real) */
function cpow(re: number, im: number, p: number): [number, number] {
  const r     = Math.sqrt(re * re + im * im)
  const theta = Math.atan2(im, re)
  const rp    = Math.pow(Math.max(r, 1e-12), p)
  return [rp * Math.cos(p * theta), rp * Math.sin(p * theta)]
}

/** Build one patch (k1, k2) of the n-th CY surface into a BufferGeometry */
function buildPatch(n: number, k1: number, k2: number, segs: number): THREE.BufferGeometry {
  const rows = segs + 1
  const pos: number[] = []
  const col: number[] = []

  for (let ia = 0; ia <= segs; ia++) {
    const alpha = (ia / segs) * (Math.PI / 2)
    const ca    = Math.cos(alpha)
    const sa    = Math.sin(alpha)

    for (let ib = 0; ib <= segs; ib++) {
      const beta  = (ib / segs) * (2 * Math.PI)
      const p     = 2 / n

      // e^(2πi k/n) = (cos(2πk/n), sin(2πk/n))
      const ang1 = (2 * Math.PI * k1) / n
      const ang2 = (2 * Math.PI * k2) / n

      // z1 = e^(i·ang1) · cos(α)^p
      const [c1re, c1im] = cpow(ca, 0, p)
      const z1re = c1re * Math.cos(ang1) - c1im * Math.sin(ang1)
      const z1im = c1re * Math.sin(ang1) + c1im * Math.cos(ang1)

      // z2 = e^(i·ang2) · sin(α)^p
      const [c2re, c2im] = cpow(sa, 0, p)
      const z2re = c2re * Math.cos(ang2) - c2im * Math.sin(ang2)
      // const z2im = c2re * Math.sin(ang2) + c2im * Math.cos(ang2)

      // Project to 3D: (Re(z1), Re(z2), Im(z1))
      // Modulate z slightly with beta for visual thickness
      const x = z1re
      const y = z2re
      const z = z1im + Math.sin(beta) * 0.015

      pos.push(x, y, z)

      // Colour by (k1+k2) patch index — creates rainbow across patches
      const hue   = ((k1 * n + k2) / (n * n)) * 360
      const c     = new THREE.Color().setHSL(hue / 360, 0.7, 0.55)
      col.push(c.r, c.g, c.b)
    }
  }

  // Triangulate
  const indices: number[] = []
  for (let ia = 0; ia < segs; ia++) {
    for (let ib = 0; ib < segs; ib++) {
      const a = ia * rows + ib
      const b = a + 1
      const c = a + rows
      const d = c + 1
      indices.push(a, c, b,  b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

// ── State ─────────────────────────────────────────────────────────────────

type CYState = {
  renderer:  THREE.WebGLRenderer
  scene:     THREE.Scene
  camera:    THREE.PerspectiveCamera
  group:     THREE.Group
  angle:     number
  lastN:     number
  lastWire:  boolean
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

function buildSurface(group: THREE.Group, n: number, wireframe: boolean) {
  // Dispose old children
  for (let i = group.children.length - 1; i >= 0; i--) {
    const obj = group.children[i] as THREE.Mesh
    group.remove(obj)
    obj.geometry?.dispose()
    if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose())
    else (obj.material as THREE.Material)?.dispose()
  }

  const segs = Math.max(8, Math.round(32 / n))

  for (let k1 = 0; k1 < n; k1++) {
    for (let k2 = 0; k2 < n; k2++) {
      const geo = buildPatch(n, k1, k2, segs)
      const mat = new THREE.MeshStandardMaterial({
        vertexColors:      true,
        side:              THREE.DoubleSide,
        roughness:         0.35,
        metalness:         0.45,
        wireframe,
        transparent:       !wireframe,
        opacity:           wireframe ? 1 : 0.88,
      })
      group.add(new THREE.Mesh(geo, mat))
    }
  }
}

// ── Module ────────────────────────────────────────────────────────────────

const CalabiYauModule: PhysicsModule<CYState> = {
  id: 'calabi-yau',

  metadata: {
    title:         'Calabi-Yau 流形',
    titleEn:       'Calabi-Yau Manifold',
    description:   '弦理论中额外维度的几何结构。每个时空点上折叠着一个六维 Calabi-Yau 流形——这里展示其二维截面在三维空间中的投影。',
    descriptionEn: 'The geometric structure of extra dimensions in string theory. At every spacetime point, a six-dimensional Calabi-Yau manifold is folded up — shown here as its 2D cross-section projected into 3D.',
    theory:        ['string-theory', 'beyond-standard-model'],
    mathLevel:     3,
    renderer:      'threejs',
  },

  // ── Init ────────────────────────────────────────────────────────────────

  init(canvas, params): CYState {
    const el = canvas as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x040408)
    rendererStore.set(canvas, renderer)

    const scene = new THREE.Scene()

    // Lighting
    scene.add(new THREE.AmbientLight(0x8090c0, 0.6))
    const key = new THREE.DirectionalLight(0xffffff, 1.2)
    key.position.set(5, 8, 6)
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xc8955a, 0.4)
    fill.position.set(-4, -3, -5)
    scene.add(fill)

    // Faint star field
    const starPos = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      const phi   = Math.random() * Math.PI * 2
      const theta = Math.acos(2 * Math.random() - 1)
      const r     = 18 + Math.random() * 5
      starPos[i * 3]     = r * Math.sin(theta) * Math.cos(phi)
      starPos[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi)
      starPos[i * 3 + 2] = r * Math.cos(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })))

    const group = new THREE.Group()
    scene.add(group)

    const n       = params.n        as number ?? 5
    const wire    = params.wireframe as boolean ?? false
    buildSurface(group, n, wire)

    const camera = new THREE.PerspectiveCamera(48, el.width / el.height, 0.01, 100)
    camera.position.set(0, 0, 2.8)
    camera.lookAt(0, 0, 0)

    return {
      renderer, scene, camera,
      group,
      angle:    0,
      lastN:    n,
      lastWire: wire,
    }
  },

  // ── Tick ────────────────────────────────────────────────────────────────

  tick(state, dt, params): CYState {
    const n    = params.n         as number
    const wire = params.wireframe as boolean
    const spd  = params.speed     as number

    // Rebuild if parameters changed
    if (n !== state.lastN || wire !== state.lastWire) {
      buildSurface(state.group, n, wire)
    }

    const angle = state.angle + dt * spd * 0.35
    state.group.rotation.y = angle
    state.group.rotation.x = Math.sin(angle * 0.41) * 0.28

    return { ...state, angle, lastN: n, lastWire: wire }
  },

  // ── Render ──────────────────────────────────────────────────────────────

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

  // ── Controls ────────────────────────────────────────────────────────────

  getControls(): ControlDefinition[] {
    return [
      {
        type:    'select',
        id:      'n',
        label:   '维度阶数 n',
        labelEn: 'Dimension order n',
        options: [
          { value: '2', label: 'n = 2  （K3 曲面）',        labelEn: 'n = 2  (K3 surface)'         },
          { value: '3', label: 'n = 3  （三次曲面）',        labelEn: 'n = 3  (cubic surface)'       },
          { value: '4', label: 'n = 4  （四次曲面）',        labelEn: 'n = 4  (quartic surface)'     },
          { value: '5', label: 'n = 5  （五次曲面，标准型）', labelEn: 'n = 5  (quintic, canonical)'  },
        ],
        default: '5',
      },
      {
        type:    'slider',
        id:      'speed',
        label:   '旋转速度',
        labelEn: 'Rotation speed',
        min:     0,
        max:     3,
        step:    0.05,
        default: 0.6,
      },
      {
        type:    'toggle',
        id:      'wireframe',
        label:   '线框模式',
        labelEn: 'Wireframe mode',
        default: false,
      },
    ]
  },

  // ── Destroy ─────────────────────────────────────────────────────────────

  destroy(canvas) {
    const renderer = rendererStore.get(canvas)
    if (renderer) {
      renderer.dispose()
      rendererStore.delete(canvas)
    }
  },
}

export default CalabiYauModule

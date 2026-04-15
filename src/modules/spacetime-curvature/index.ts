// Spacetime Curvature — Three.js rubber-sheet gravity visualization
// A flat grid warps downward under massive objects (Newtonian potential analogy).
// Users can drag masses around the grid to reshape the curvature in real time.

import type { PhysicsModule, ControlDefinition, Params } from '@/types/physics'
import * as THREE from 'three'

// ── Constants ─────────────────────────────────────────────────────────────

const GRID_SEG  = 72          // grid subdivisions per side
const GRID_SIZE = 8           // world-units half-width of the grid
const MAX_DEPTH = 4.5         // max downward warp (world units)
const EPSILON   = 0.35        // softening length (avoids singularity)
const NUM_MASSES = 3          // number of draggable masses

// Colour gradient: flat=dark blue, deep well=bright gold
const COL_FLAT  = new THREE.Color(0x0a1a2e)
const COL_WELL  = new THREE.Color(0xc8955a)

// ── State ─────────────────────────────────────────────────────────────────

type Mass = {
  x: number   // position on the grid (−GRID_SIZE … +GRID_SIZE)
  z: number
  m: number   // mass (arbitrary units)
  mesh: THREE.Mesh
}

type SpacetimeState = {
  renderer:   THREE.WebGLRenderer
  scene:      THREE.Scene
  camera:     THREE.PerspectiveCamera
  gridGeo:    THREE.BufferGeometry
  posAttr:    THREE.BufferAttribute
  colAttr:    THREE.BufferAttribute
  basePos:    Float32Array       // flat grid positions (reference)
  masses:     Mass[]
  dragPlane:  THREE.Plane        // invisible horizontal plane for raycasting
  raycaster:  THREE.Raycaster
  dragIdx:    number             // index of mass being dragged (-1=none, -2=orbit drag)
  camAngle:   number
  azimuth:    number             // camera azimuth (radians)
  elevation:  number             // camera elevation (radians)
  baseDist:   number             // base camera distance
  prevMouseX: number
  prevMouseY: number
}

const rendererStore = new WeakMap<HTMLElement, THREE.WebGLRenderer>()

// ── Helpers ───────────────────────────────────────────────────────────────

function buildGrid(): {
  geo: THREE.BufferGeometry
  posAttr: THREE.BufferAttribute
  colAttr: THREE.BufferAttribute
  basePos: Float32Array
} {
  const V = (GRID_SEG + 1) * (GRID_SEG + 1)
  const base = new Float32Array(V * 3)
  const pos  = new Float32Array(V * 3)
  const col  = new Float32Array(V * 3)

  let v = 0
  for (let iz = 0; iz <= GRID_SEG; iz++) {
    for (let ix = 0; ix <= GRID_SEG; ix++) {
      const x = (ix / GRID_SEG - 0.5) * GRID_SIZE * 2
      const z = (iz / GRID_SEG - 0.5) * GRID_SIZE * 2
      base[v * 3]     = x
      base[v * 3 + 1] = 0
      base[v * 3 + 2] = z
      pos[v * 3]     = x
      pos[v * 3 + 1] = 0
      pos[v * 3 + 2] = z
      col[v * 3]     = COL_FLAT.r
      col[v * 3 + 1] = COL_FLAT.g
      col[v * 3 + 2] = COL_FLAT.b
      v++
    }
  }

  // Build index buffer (two triangles per quad)
  const indices: number[] = []
  const stride = GRID_SEG + 1
  for (let iz = 0; iz < GRID_SEG; iz++) {
    for (let ix = 0; ix < GRID_SEG; ix++) {
      const a = iz * stride + ix
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

  return { geo, posAttr, colAttr, basePos: base }
}

function makeMassSphere(m: number): THREE.Mesh {
  const r   = 0.15 + m * 0.06
  const geo = new THREE.SphereGeometry(r, 24, 16)
  const mat = new THREE.MeshStandardMaterial({
    color:             0xc8955a,
    emissive:          new THREE.Color(0xc8955a),
    emissiveIntensity: 0.55,
    roughness:         0.3,
    metalness:         0.7,
  })
  return new THREE.Mesh(geo, mat)
}

/** Update every grid vertex's Y and colour based on current masses */
function updateGrid(
  posAttr: THREE.BufferAttribute,
  colAttr: THREE.BufferAttribute,
  basePos: Float32Array,
  masses:  Mass[],
  strength: number,
) {
  const V = (GRID_SEG + 1) * (GRID_SEG + 1)
  for (let v = 0; v < V; v++) {
    const x = basePos[v * 3]
    const z = basePos[v * 3 + 2]

    // Sum potential from all masses
    let phi = 0
    for (const mass of masses) {
      const dx  = x - mass.x
      const dz  = z - mass.z
      const d2  = dx * dx + dz * dz + EPSILON * EPSILON
      phi      -= mass.m / Math.sqrt(d2)
    }

    const y = Math.max(-MAX_DEPTH, phi * strength * 0.22)
    posAttr.setY(v, y)

    // Colour: blend flat→well based on depth
    const t = Math.min(1, -y / MAX_DEPTH)
    const c = COL_FLAT.clone().lerp(COL_WELL, t)
    colAttr.setXYZ(v, c.r, c.g, c.b)
  }
  posAttr.needsUpdate = true
  colAttr.needsUpdate = true
}

/** Return the grid Y under a given (wx, wz) world position */
function gridYAt(masses: Mass[], wx: number, wz: number, strength: number): number {
  let phi = 0
  for (const mass of masses) {
    const dx = wx - mass.x
    const dz = wz - mass.z
    const d2 = dx * dx + dz * dz + EPSILON * EPSILON
    phi     -= mass.m / Math.sqrt(d2)
  }
  return Math.max(-MAX_DEPTH, phi * strength * 0.22)
}

// ── Module ────────────────────────────────────────────────────────────────

const SpacetimeCurvatureModule: PhysicsModule<SpacetimeState> = {
  id: 'spacetime-curvature',

  metadata: {
    title:         '时空曲率',
    titleEn:       'Spacetime Curvature',
    description:   '爱因斯坦广义相对论：质量弯曲时空，时空曲率决定物质运动轨迹。拖动质量块实时重塑引力场。',
    descriptionEn: 'General relativity: mass curves spacetime, and curvature governs how matter moves. Drag masses to reshape the gravitational field in real time.',
    theory:        ['general-relativity'],
    mathLevel:     2,
    renderer:      'threejs',
  },

  // ── Init ──────────────────────────────────────────────────────────────────

  init(canvas, params): SpacetimeState {
    const el = canvas as HTMLCanvasElement

    const renderer = new THREE.WebGLRenderer({ canvas: el, antialias: true })
    renderer.setSize(el.width, el.height, false)
    renderer.setClearColor(0x030610)
    rendererStore.set(canvas, renderer)

    const scene   = new THREE.Scene()
    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    scene.add(ambient)

    // Directional light from above-front
    const dirLight = new THREE.DirectionalLight(0xb0c8ff, 1.1)
    dirLight.position.set(4, 12, 6)
    scene.add(dirLight)

    // Subtle bottom fill
    const fillLight = new THREE.DirectionalLight(0xc8955a, 0.3)
    fillLight.position.set(0, -1, 0)
    scene.add(fillLight)

    // ── Grid ────────────────────────────────────────────────────────────────
    const { geo, posAttr, colAttr, basePos } = buildGrid()
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side:         THREE.DoubleSide,
      roughness:    0.55,
      metalness:    0.15,
      wireframe:    false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    scene.add(mesh)

    // Thin wireframe overlay
    const wireMat  = new THREE.MeshBasicMaterial({
      color:       0x1a3050,
      wireframe:   true,
      transparent: true,
      opacity:     0.25,
    })
    scene.add(new THREE.Mesh(geo, wireMat))

    // ── Masses ──────────────────────────────────────────────────────────────
    const strength   = params.strength as number ?? 3
    const massVal    = params.massVal  as number ?? 2
    const initPos    = [
      { x: -1.8, z:  0.5 },
      { x:  2.2, z: -0.8 },
      { x:  0.0, z:  2.5 },
    ]

    const masses: Mass[] = initPos.slice(0, NUM_MASSES).map(({ x, z }) => {
      const m    = massVal
      const sph  = makeMassSphere(m)
      scene.add(sph)
      return { x, z, m, mesh: sph }
    })

    // Initial grid warp
    updateGrid(posAttr, colAttr, basePos, masses, strength)
    masses.forEach((mass) => {
      mass.mesh.position.set(mass.x, gridYAt(masses, mass.x, mass.z, strength) + (0.15 + mass.m * 0.06), mass.z)
    })
    geo.computeVertexNormals()

    // ── Camera ──────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(45, el.width / el.height, 0.1, 200)
    camera.position.set(0, 9, 14)
    camera.lookAt(0, -1, 0)

    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

    return {
      renderer, scene, camera,
      gridGeo: geo, posAttr, colAttr, basePos,
      masses,
      dragPlane,
      raycaster:  new THREE.Raycaster(),
      dragIdx:    -1,
      camAngle:   0,
      azimuth:    0,
      elevation:  Math.PI / 7,   // ~26° above horizontal
      baseDist:   15,
      prevMouseX: -1,
      prevMouseY: -1,
    }
  },

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(state, dt, params): SpacetimeState {
    const zoom     = (params._zoom as number) ?? 1
    const strength = params.strength as number
    const massVal  = params.massVal  as number
    const rotate   = params.rotate   as boolean

    // Update mass values
    state.masses.forEach((mass) => { mass.m = massVal })

    // Update grid warp
    updateGrid(state.posAttr, state.colAttr, state.basePos, state.masses, strength)
    state.gridGeo.computeVertexNormals()

    // Sit each sphere on top of the warped surface
    state.masses.forEach((mass) => {
      const r = 0.15 + mass.m * 0.06
      const y = gridYAt(state.masses, mass.x, mass.z, strength)
      mass.mesh.position.set(mass.x, y + r, mass.z)
    })

    // Handle mouse interaction
    const mouseX = params._mouseX as number ?? -1
    const mouseY = params._mouseY as number ?? -1
    const el     = state.renderer.domElement

    let { azimuth, elevation, baseDist, prevMouseX, prevMouseY, dragIdx, camAngle } = state

    if (mouseX >= 0 && mouseY >= 0) {
      const ndcX =  (mouseX / el.width)  * 2 - 1
      const ndcY = -(mouseY / el.height) * 2 + 1
      state.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), state.camera)

      if (!params._dragging) {
        // Not dragging: reset drag target and update hover highlights
        dragIdx = -1
        const hits = state.raycaster.intersectObjects(state.masses.map((m) => m.mesh))
        state.masses.forEach((m, i) => {
          const mat     = m.mesh.material as THREE.MeshStandardMaterial
          const hovered = hits.some((h) => h.object === m.mesh)
          mat.emissiveIntensity = hovered ? 1.0 : 0.55
          ;(state.masses[i] as Mass & { hovered?: boolean }).hovered = hovered
        })
      } else {
        // First frame of drag: decide mass drag vs camera orbit
        if (dragIdx === -1) {
          const hoveredIdx = state.masses.findIndex((m) => (m as Mass & { hovered?: boolean }).hovered)
          dragIdx = hoveredIdx >= 0 ? hoveredIdx : -2   // -2 = camera orbit
        }
        if (dragIdx >= 0) {
          // Mass drag: project onto horizontal plane
          const target = new THREE.Vector3()
          state.raycaster.ray.intersectPlane(state.dragPlane, target)
          const clamp = GRID_SIZE * 0.9
          state.masses[dragIdx].x = Math.max(-clamp, Math.min(clamp, target.x))
          state.masses[dragIdx].z = Math.max(-clamp, Math.min(clamp, target.z))
        } else if (dragIdx === -2 && prevMouseX >= 0 && prevMouseY >= 0) {
          // Camera orbit: update azimuth/elevation from mouse delta
          const dmx = mouseX - prevMouseX
          const dmy = mouseY - prevMouseY
          azimuth   -= dmx * 0.008
          elevation  = Math.max(0.05, Math.min(Math.PI * 0.45, elevation + dmy * 0.005))
        }
      }
    } else if (!params._dragging) {
      dragIdx = -1
    }

    prevMouseX = mouseX >= 0 ? mouseX : -1
    prevMouseY = mouseY >= 0 ? mouseY : -1

    // Camera positioning: zoom controls distance, azimuth/elevation controls angle
    const dist = baseDist / Math.max(0.1, zoom)
    if (rotate) {
      camAngle += dt * 0.12
      state.camera.position.set(
        Math.sin(camAngle) * dist * Math.cos(elevation),
        dist * Math.sin(elevation),
        Math.cos(camAngle) * dist * Math.cos(elevation),
      )
    } else {
      state.camera.position.set(
        dist * Math.cos(elevation) * Math.sin(azimuth),
        dist * Math.sin(elevation),
        dist * Math.cos(elevation) * Math.cos(azimuth),
      )
    }
    state.camera.lookAt(0, -1, 0)

    return { ...state, azimuth, elevation, baseDist, prevMouseX, prevMouseY, dragIdx, camAngle }
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
        id:      'strength',
        label:   '引力强度',
        labelEn: 'Gravity strength',
        min:     0.5,
        max:     8,
        step:    0.1,
        default: 3,
      },
      {
        type:    'slider',
        id:      'massVal',
        label:   '质量',
        labelEn: 'Mass',
        min:     0.5,
        max:     5,
        step:    0.1,
        default: 2,
      },
      {
        type:    'toggle',
        id:      'rotate',
        label:   '镜头旋转',
        labelEn: 'Rotate camera',
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

export default SpacetimeCurvatureModule

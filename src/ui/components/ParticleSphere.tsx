'use client'
// ── ParticleSphere ─────────────────────────────────────────────────────────
// Three.js sphere of ~1500 particles.
// Mouse hover: repels nearby particles; they spring back when cursor leaves.

import { useRef, useEffect } from 'react'
import * as THREE from 'three'

const N = 1500
const R = 1.25  // sphere radius (world units)

// ── Helpers ───────────────────────────────────────────────────────────────

/** Soft circular glow sprite (drawn once, reused as texture) */
function makeSprite(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0,   'rgba(255,255,255,1.0)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.7)')
  grad.addColorStop(0.7, 'rgba(255,255,255,0.15)')
  grad.addColorStop(1,   'rgba(255,255,255,0.0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

/** Fibonacci-spiral distribution for uniform sphere coverage */
function fibSphere(n: number, r: number): Float32Array {
  const pos = new Float32Array(n * 3)
  const phi = Math.PI * (1 + Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y  = 1 - (i / (n - 1)) * 2
    const rd = Math.sqrt(Math.max(0, 1 - y * y))
    const t  = phi * i
    pos[i * 3]     = rd * Math.cos(t) * r
    pos[i * 3 + 1] = y * r
    pos[i * 3 + 2] = rd * Math.sin(t) * r
  }
  return pos
}

// ── Component ─────────────────────────────────────────────────────────────

export default function ParticleSphere() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = mountRef.current!
    const w  = el.clientWidth
    const h  = el.clientHeight

    // ── Renderer ────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(devicePixelRatio)
    renderer.setSize(w, h)
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100)
    camera.position.z = 3.8

    // ── Particle buffers ─────────────────────────────────────────────────
    const base = fibSphere(N, R)          // rest positions (never modified)
    const cur  = new Float32Array(N * 3)  // current positions (same buffer → BufferAttribute)
    const vel  = new Float32Array(N * 3)  // velocities
    const col  = new Float32Array(N * 3)  // colours
    cur.set(base)

    for (let i = 0; i < N; i++) {
      const copper = Math.random() < 0.09
      if (copper) {
        col[i*3] = 200/255; col[i*3+1] = 149/255; col[i*3+2] = 90/255
      } else {
        const t = Math.random()
        col[i*3]   = 0.04 + t * 0.14
        col[i*3+1] = 0.14 + t * 0.38
        col[i*3+2] = 0.44 + t * 0.52
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(cur, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3))

    const mat = new THREE.PointsMaterial({
      size:         0.026,
      map:          makeSprite(),
      vertexColors: true,
      transparent:  true,
      alphaTest:    0.001,
      depthWrite:   false,
      blending:     THREE.AdditiveBlending,
    })

    const pts = new THREE.Points(geo, mat)
    scene.add(pts)

    // ── Mouse state ──────────────────────────────────────────────────────
    let mouseActive = false
    const mNDC = { x: 0, y: 0 }

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      mNDC.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mNDC.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      mouseActive = true
    }
    const onLeave = () => { mouseActive = false }
    el.addEventListener('mousemove',  onMove)
    el.addEventListener('mouseleave', onLeave)

    // Reusable objects (avoid GC in hot loop)
    const raycaster = new THREE.Raycaster()
    const mouseVec  = new THREE.Vector2()
    const invMat    = new THREE.Matrix4()
    const ro        = new THREE.Vector3()
    const rd        = new THREE.Vector3()

    // ── Animation loop ───────────────────────────────────────────────────
    let frame = 0
    let rafId = 0

    const loop = () => {
      rafId = requestAnimationFrame(loop)
      frame++

      // Ambient rotation
      pts.rotation.y += 0.0006
      pts.rotation.x  = Math.sin(frame * 0.0004) * 0.12
      pts.updateMatrixWorld()

      // Compute mouse ray in object space (avoids matrix math per-particle)
      if (mouseActive) {
        mouseVec.set(mNDC.x, mNDC.y)
        raycaster.setFromCamera(mouseVec, camera)
        invMat.copy(pts.matrixWorld).invert()
        ro.copy(raycaster.ray.origin).applyMatrix4(invMat)
        rd.copy(raycaster.ray.direction).transformDirection(invMat).normalize()
      }

      const INFLUENCE = 0.40
      const INF2      = INFLUENCE * INFLUENCE

      for (let i = 0; i < N; i++) {
        const i3 = i * 3
        const cx = cur[i3], cy = cur[i3+1], cz = cur[i3+2]

        // Mouse repulsion
        if (mouseActive) {
          const dx = cx - ro.x, dy = cy - ro.y, dz = cz - ro.z
          const dot = dx*rd.x + dy*rd.y + dz*rd.z
          if (dot > -0.3 && dot < 4.5) {
            const px = dx - dot*rd.x
            const py = dy - dot*rd.y
            const pz = dz - dot*rd.z
            const d2 = px*px + py*py + pz*pz
            if (d2 < INF2) {
              const d     = Math.sqrt(d2) + 1e-5
              const force = (1 - d / INFLUENCE) * 0.055
              vel[i3]   += (px / d) * force
              vel[i3+1] += (py / d) * force
              vel[i3+2] += (pz / d) * force
            }
          }
        }

        // Spring back to rest position
        vel[i3]   += (base[i3]   - cx) * 0.055
        vel[i3+1] += (base[i3+1] - cy) * 0.055
        vel[i3+2] += (base[i3+2] - cz) * 0.055

        // Damping
        vel[i3]   *= 0.87
        vel[i3+1] *= 0.87
        vel[i3+2] *= 0.87

        // Integrate
        cur[i3]   = cx + vel[i3]
        cur[i3+1] = cy + vel[i3+1]
        cur[i3+2] = cz + vel[i3+2]
      }

      ;(geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
      renderer.render(scene, camera)
    }
    loop()

    // Resize
    const obs = new ResizeObserver(() => {
      const nw = el.clientWidth, nh = el.clientHeight
      renderer.setSize(nw, nh)
      camera.aspect = nw / nh
      camera.updateProjectionMatrix()
    })
    obs.observe(el)

    return () => {
      cancelAnimationFrame(rafId)
      obs.disconnect()
      el.removeEventListener('mousemove',  onMove)
      el.removeEventListener('mouseleave', onLeave)
      geo.dispose()
      mat.map?.dispose()
      mat.dispose()
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="w-full h-full" />
}

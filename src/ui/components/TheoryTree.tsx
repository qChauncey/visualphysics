'use client'
// ── TheoryTree — Canvas-based immersive physics theory timeline ───────────────
// Time flows UPWARD: oldest (1687 Newton) at bottom, newest (1997 Maldacena) at top.
// Particle effects flow along influence edges. Pan + pinch-zoom. Click for detail.

import { useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { NODES, NODE_MAP, CAT_CONFIG, type TheoryNode } from '@/core/theory-tree/data'
import { useLang } from '@/core/i18n'

// ── Layout constants ───────────────────────────────────────────────────────────

const YEAR_START = 1680
const YEAR_END   = 2010
const YEAR_RANGE = YEAR_END - YEAR_START
const LANE_W     = 165
const NODE_R     = 20
const PAD_Y      = 110
const CANVAS_H   = YEAR_RANGE * 6 + PAD_Y * 2   // ~2200px
const CANVAS_W   = 6 * LANE_W + 130              // ~1120px

// Y mapping: oldest at BOTTOM, newest at TOP
const yx = (year: number) =>
  CANVAS_H - PAD_Y - ((year - YEAR_START) / YEAR_RANGE) * (CANVAS_H - PAD_Y * 2)

// X mapping: lane → horizontal position
const lx = (lane: number) => 75 + lane * LANE_W

// ── Precomputed node positions ─────────────────────────────────────────────────

interface NodePos { node: TheoryNode; x: number; y: number }

const NODE_POS: NodePos[] = NODES.map((node) => ({
  node,
  x: lx(CAT_CONFIG[node.category].lane),
  y: yx(node.year),
}))

const POS_MAP: Record<string, NodePos> = Object.fromEntries(
  NODE_POS.map((np) => [np.node.id, np])
)

// ── Edges ──────────────────────────────────────────────────────────────────────

interface Edge { fromId: string; toId: string; color: string }

const EDGES: Edge[] = []
for (const node of NODES) {
  for (const toId of node.influences) {
    if (POS_MAP[toId]) EDGES.push({ fromId: node.id, toId, color: CAT_CONFIG[node.category].color })
  }
}

// ── Particles ──────────────────────────────────────────────────────────────────

interface Particle {
  edgeFromId: string
  edgeToId:   string
  progress:   number   // 0→1: source→target
  speed:      number   // fraction per second
  color:      string
}

function initParticles(): Particle[] {
  const out: Particle[] = []
  for (const e of EDGES) {
    const count = Math.random() < 0.4 ? 3 : 2
    for (let i = 0; i < count; i++) {
      out.push({
        edgeFromId: e.fromId,
        edgeToId:   e.toId,
        progress:   Math.random(),
        speed:      0.08 + Math.random() * 0.07,
        color:      e.color,
      })
    }
  }
  return out
}

// Cubic bezier position (S-curve, vertical control points)
function bezierPoint(t: number, fx: number, fy: number, tx: number, ty: number): [number, number] {
  const my = (fy + ty) / 2
  const mt = 1 - t
  return [
    mt * mt * mt * fx + 3 * mt * mt * t * fx + 3 * mt * t * t * tx + t * t * t * tx,
    mt * mt * mt * fy + 3 * mt * mt * t * my + 3 * mt * t  * t * my + t * t * t * ty,
  ]
}

// ── Background stars ───────────────────────────────────────────────────────────

interface Star { x: number; y: number; r: number; a: number }
const STARS: Star[] = Array.from({ length: 220 }, () => ({
  x: Math.random() * CANVAS_W * 1.3 - CANVAS_W * 0.15,
  y: Math.random() * CANVAS_H * 1.2 - CANVAS_H * 0.1,
  r: Math.random() * 1.3 + 0.25,
  a: Math.random() * 0.4 + 0.05,
}))

// ── Component ──────────────────────────────────────────────────────────────────

export default function TheoryTree() {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number>(0)

  // Mutable render state (no re-renders on change)
  const st = useRef({
    panX: 0, panY: 0, zoom: 0.55,
    dragging: false,
    dragStartX: 0, dragStartY: 0, dragTotalMoved: 0,
    prevTouchDist: 0,
    particles: initParticles(),
    lastTime: 0,
    hoveredId: null as string | null,
    initialized: false,
  })

  const [selected, setSelected] = useState<TheoryNode | null>(null)
  const { lang } = useLang()
  const langRef     = useRef(lang)
  langRef.current   = lang
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  // ── Fit tree to viewport on first resize ────────────────────────────────────
  const initView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || st.current.initialized) return
    const W = canvas.width, H = canvas.height
    if (W === 0 || H === 0) return
    const zoom = Math.min((H * 0.94) / CANVAS_H, (W * 0.92) / CANVAS_W, 0.68)
    st.current.zoom = zoom
    st.current.panX = (W - CANVAS_W * zoom) / 2
    st.current.panY = (H - CANVAS_H * zoom) / 2
    st.current.initialized = true
  }, [])

  // ── Resize observer ──────────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new ResizeObserver(([entry]) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const { width, height } = entry.contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width  = Math.round(width  * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width  = `${width}px`
      canvas.style.height = `${height}px`
      initView()
    })
    obs.observe(container)
    return () => obs.disconnect()
  }, [initView])

  // ── Hit test ─────────────────────────────────────────────────────────────────
  const hitTest = useCallback((cx: number, cy: number): NodePos | null => {
    const s   = st.current
    const dpr = window.devicePixelRatio || 1
    const wx  = (cx * dpr - s.panX) / s.zoom
    const wy  = (cy * dpr - s.panY) / s.zoom
    for (const np of NODE_POS) {
      if (Math.hypot(np.x - wx, np.y - wy) <= NODE_R + 10) return np
    }
    return null
  }, [])

  // ── Mouse handlers ───────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: MouseEvent) => {
    const s = st.current
    s.dragging = true
    s.dragStartX = e.clientX
    s.dragStartY = e.clientY
    s.dragTotalMoved = 0
  }, [])

  const onMouseMove = useCallback((e: MouseEvent) => {
    const s = st.current
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    s.hoveredId = hitTest(e.clientX - rect.left, e.clientY - rect.top)?.node.id ?? null
    if (s.dragging) {
      const dpr = window.devicePixelRatio || 1
      s.panX += (e.clientX - s.dragStartX) * dpr
      s.panY += (e.clientY - s.dragStartY) * dpr
      s.dragTotalMoved += Math.abs(e.clientX - s.dragStartX) + Math.abs(e.clientY - s.dragStartY)
      s.dragStartX = e.clientX
      s.dragStartY = e.clientY
    }
  }, [hitTest])

  const onMouseUp = useCallback((e: MouseEvent) => {
    const s = st.current
    if (s.dragging && s.dragTotalMoved < 6) {
      const canvas = canvasRef.current
      if (canvas) {
        const rect = canvas.getBoundingClientRect()
        const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top)
        setSelected(prev => hit ? (prev?.id === hit.node.id ? null : hit.node) : null)
      }
    }
    s.dragging = false
  }, [hitTest])

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const s = st.current
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const dpr  = window.devicePixelRatio || 1
    const cx   = (e.clientX - rect.left) * dpr
    const cy   = (e.clientY - rect.top)  * dpr
    const factor  = e.deltaY < 0 ? 1.10 : 0.91
    const newZoom = Math.max(0.18, Math.min(3.5, s.zoom * factor))
    s.panX = cx - (cx - s.panX) * (newZoom / s.zoom)
    s.panY = cy - (cy - s.panY) * (newZoom / s.zoom)
    s.zoom = newZoom
  }, [])

  // ── Touch handlers ───────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const s = st.current
    if (e.touches.length === 1) {
      s.dragging = true
      s.dragStartX = e.touches[0].clientX
      s.dragStartY = e.touches[0].clientY
      s.dragTotalMoved = 0
    } else if (e.touches.length === 2) {
      s.dragging = false
      s.prevTouchDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
    }
  }, [])

  const onTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault()
    const s = st.current
    const canvas = canvasRef.current
    const dpr = window.devicePixelRatio || 1
    if (e.touches.length === 1 && s.dragging) {
      s.panX += (e.touches[0].clientX - s.dragStartX) * dpr
      s.panY += (e.touches[0].clientY - s.dragStartY) * dpr
      s.dragTotalMoved += Math.abs(e.touches[0].clientX - s.dragStartX) + Math.abs(e.touches[0].clientY - s.dragStartY)
      s.dragStartX = e.touches[0].clientX
      s.dragStartY = e.touches[0].clientY
    } else if (e.touches.length === 2 && canvas) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      )
      if (s.prevTouchDist > 0) {
        const rect = canvas.getBoundingClientRect()
        const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) * dpr
        const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top)  * dpr
        const newZoom = Math.max(0.18, Math.min(3.5, s.zoom * dist / s.prevTouchDist))
        s.panX = cx - (cx - s.panX) * (newZoom / s.zoom)
        s.panY = cy - (cy - s.panY) * (newZoom / s.zoom)
        s.zoom = newZoom
      }
      s.prevTouchDist = dist
    }
  }, [])

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const s = st.current
    if (e.touches.length === 0 && s.dragging && s.dragTotalMoved < 12) {
      const canvas = canvasRef.current
      if (canvas && e.changedTouches.length > 0) {
        const rect = canvas.getBoundingClientRect()
        const t = e.changedTouches[0]
        const hit = hitTest(t.clientX - rect.left, t.clientY - rect.top)
        if (hit) setSelected(prev => prev?.id === hit.node.id ? null : hit.node)
      }
    }
    s.dragging = e.touches.length > 0
    if (e.touches.length < 2) s.prevTouchDist = 0
  }, [hitTest])

  // ── Attach canvas event listeners ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseUp as EventListener)
    canvas.addEventListener('wheel',      onWheel, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })
    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseUp as EventListener)
      canvas.removeEventListener('wheel',      onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
    }
  }, [onMouseDown, onMouseMove, onMouseUp, onWheel, onTouchStart, onTouchMove, onTouchEnd])

  // ── Animation loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw)
      const ctx = canvas!.getContext('2d')
      if (!ctx) return
      const s = st.current
      const dt = s.lastTime ? Math.min((now - s.lastTime) / 1000, 0.08) : 0
      s.lastTime = now
      const curLang = langRef.current
      const curSel  = selectedRef.current

      // Advance particles
      for (const p of s.particles) {
        p.progress += p.speed * dt
        if (p.progress >= 1) p.progress -= 1
      }

      const W = canvas!.width, H = canvas!.height

      // ── Background ───────────────────────────────────────────────────────────
      ctx.fillStyle = '#04040c'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.setTransform(s.zoom, 0, 0, s.zoom, s.panX, s.panY)

      // ── Stars ─────────────────────────────────────────────────────────────────
      for (const star of STARS) {
        ctx.beginPath()
        ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240,237,232,${star.a})`
        ctx.fill()
      }

      // ── Column background tints ────────────────────────────────────────────────
      for (const cfg of Object.values(CAT_CONFIG)) {
        ctx.fillStyle = cfg.color + '09'
        ctx.fillRect(lx(cfg.lane) - LANE_W / 2, 0, LANE_W, CANVAS_H)
      }

      // ── Year gridlines ─────────────────────────────────────────────────────────
      ctx.setLineDash([4, 12])
      ctx.lineWidth = 0.6
      ctx.strokeStyle = 'rgba(240,237,232,0.055)'
      ctx.font = '9px monospace'
      ctx.fillStyle = 'rgba(240,237,232,0.18)'
      for (const yr of [1700, 1800, 1850, 1900, 1925, 1950, 1975, 2000]) {
        const y = yx(yr)
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke()
        ctx.fillText(String(yr), 8, y - 5)
      }
      ctx.setLineDash([])

      // ── Category column labels ─────────────────────────────────────────────────
      ctx.textAlign = 'center'
      ctx.font = '7.5px monospace'
      for (const cfg of Object.values(CAT_CONFIG)) {
        ctx.fillStyle = cfg.color + 'AA'
        ctx.fillText(
          (curLang === 'zh' ? cfg.label : cfg.labelEn).toUpperCase(),
          lx(cfg.lane), 42
        )
      }
      ctx.textAlign = 'left'

      // ── Connected-set for hover highlight ─────────────────────────────────────
      const hovId = s.hoveredId
      const connectedIds = new Set<string>()
      if (hovId) {
        connectedIds.add(hovId)
        for (const node of NODES) {
          if (node.id === hovId) {
            for (const inf of node.influences) connectedIds.add(inf)
          }
          if (node.influences.includes(hovId)) connectedIds.add(node.id)
        }
      }

      // ── Edges ─────────────────────────────────────────────────────────────────
      for (const e of EDGES) {
        const from = POS_MAP[e.fromId], to = POS_MAP[e.toId]
        if (!from || !to) continue
        const conn  = !hovId || (connectedIds.has(e.fromId) && connectedIds.has(e.toId))
        const alpha = hovId ? (conn ? 0.62 : 0.05) : 0.22
        const my    = (from.y + to.y) / 2

        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.bezierCurveTo(from.x, my, to.x, my, to.x, to.y)
        ctx.strokeStyle = e.color + Math.round(alpha * 255).toString(16).padStart(2, '0')
        ctx.lineWidth   = conn && hovId ? 2.0 : 1.4
        ctx.stroke()
      }

      // ── Particles ─────────────────────────────────────────────────────────────
      for (const p of s.particles) {
        const from = POS_MAP[p.edgeFromId], to = POS_MAP[p.edgeToId]
        if (!from || !to) continue
        const conn = !hovId || (connectedIds.has(p.edgeFromId) && connectedIds.has(p.edgeToId))
        if (hovId && !conn) continue

        const [bx, by] = bezierPoint(p.progress, from.x, from.y, to.x, to.y)
        const alpha     = 0.45 + Math.sin(p.progress * Math.PI) * 0.55

        ctx.save()
        ctx.shadowBlur  = 9
        ctx.shadowColor = p.color
        ctx.beginPath()
        ctx.arc(bx, by, 3.2, 0, Math.PI * 2)
        ctx.fillStyle = p.color + Math.round(alpha * 210).toString(16).padStart(2, '0')
        ctx.fill()
        ctx.restore()
      }

      // ── Nodes ─────────────────────────────────────────────────────────────────
      for (const { node, x, y } of NODE_POS) {
        const cfg    = CAT_CONFIG[node.category]
        const isHov  = node.id === hovId
        const isSel  = node.id === curSel?.id
        const dimmed = hovId && !connectedIds.has(node.id) && !isHov
        const mul    = dimmed ? 0.20 : 1

        // Dashed ring for nodes with interactive modules
        if (node.module) {
          ctx.setLineDash([3, 3])
          ctx.beginPath()
          ctx.arc(x, y, NODE_R + 5, 0, Math.PI * 2)
          ctx.strokeStyle = cfg.color + Math.round(0.50 * mul * 255).toString(16).padStart(2, '0')
          ctx.lineWidth   = 1.2
          ctx.stroke()
          ctx.setLineDash([])
        }

        // Selection glow
        if (isSel) {
          ctx.beginPath()
          ctx.arc(x, y, NODE_R + 9, 0, Math.PI * 2)
          ctx.fillStyle = cfg.color + '28'
          ctx.fill()
        }

        // Hover glow
        if (isHov) {
          ctx.save()
          ctx.shadowBlur  = 18
          ctx.shadowColor = cfg.color
          ctx.beginPath()
          ctx.arc(x, y, NODE_R + 1, 0, Math.PI * 2)
          ctx.strokeStyle = cfg.color + 'CC'
          ctx.lineWidth   = 2
          ctx.stroke()
          ctx.restore()
        }

        // Node body
        ctx.beginPath()
        ctx.arc(x, y, NODE_R, 0, Math.PI * 2)
        ctx.fillStyle   = isSel ? cfg.color : '#0b0b14'
        ctx.fill()
        ctx.strokeStyle = cfg.color + Math.round((isSel ? 1 : 0.72) * mul * 255).toString(16).padStart(2, '0')
        ctx.lineWidth   = isSel ? 2.5 : 1.5
        ctx.stroke()

        // Year inside node
        ctx.font      = 'bold 7px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = isSel
          ? 'rgba(4,4,16,0.9)'
          : cfg.color + Math.round(0.88 * mul * 255).toString(16).padStart(2, '0')
        ctx.fillText(String(node.year), x, y - 1)

        // Person (first name)
        ctx.font      = '5px monospace'
        ctx.fillStyle = isSel ? 'rgba(4,4,16,0.55)' : `rgba(240,237,232,${0.28 * mul})`
        ctx.fillText(node.person.split(' · ')[0], x, y + 10)
        ctx.textAlign = 'left'

        // Title label to the right
        const title = curLang === 'zh' ? node.title : node.titleEn
        ctx.font      = `${isSel ? 'bold ' : ''}8.5px monospace`
        ctx.fillStyle = isSel ? cfg.color : `rgba(240,237,232,${0.52 * mul})`
        ctx.fillText(
          title.length > 14 ? title.slice(0, 13) + '…' : title,
          x + NODE_R + 7, y + 4
        )
      }

      ctx.restore()
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── JSX ───────────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="w-full h-full relative select-none overflow-hidden bg-[#04040c]">

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      />

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          node={selected}
          lang={lang}
          onClose={() => setSelected(null)}
          onSelect={setSelected}
        />
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 pointer-events-none">
        {Object.entries(CAT_CONFIG).map(([cat, cfg]) => (
          <div key={cat} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
            <span className="font-mono text-[8px] text-[#f0ede8]/35">
              {lang === 'zh' ? cfg.label : cfg.labelEn}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-[7px] text-[#f0ede8]/18 tracking-wider">– – –</span>
          <span className="font-mono text-[7px] text-[#f0ede8]/20">
            {lang === 'zh' ? '有交互模块' : 'has interactive module'}
          </span>
        </div>
      </div>

      {/* Hint */}
      <p className="absolute top-4 left-1/2 -translate-x-1/2 font-mono text-[8px] text-[#f0ede8]/18 tracking-widest pointer-events-none whitespace-nowrap">
        {lang === 'zh' ? '拖曳平移 · 滚轮缩放 · 点击节点' : 'drag to pan · scroll to zoom · click nodes'}
      </p>

    </div>
  )
}

// ── Detail panel component ─────────────────────────────────────────────────────

function DetailPanel({
  node, lang, onClose, onSelect,
}: {
  node:     TheoryNode
  lang:     'zh' | 'en'
  onClose:  () => void
  onSelect: (n: TheoryNode) => void
}) {
  const cfg = CAT_CONFIG[node.category]
  return (
    <div className="absolute top-4 right-4 w-72 bg-[#07070f]/95 border border-[#f0ede8]/10 p-5 shadow-2xl backdrop-blur-sm">
      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-[#f0ede8]/30 hover:text-[#f0ede8]/60 text-lg leading-none transition-colors"
      >✕</button>

      <span
        className="font-mono text-[7px] tracking-[0.2em] uppercase px-2 py-0.5 mb-3 inline-block"
        style={{
          color:           cfg.color,
          border:          `1px solid ${cfg.color}44`,
          backgroundColor: `${cfg.color}11`,
        }}
      >
        {lang === 'zh' ? cfg.label : cfg.labelEn}
      </span>

      <h2 className="font-display font-light text-[20px] leading-tight text-[#f0ede8] mb-1">
        {lang === 'zh' ? node.title : node.titleEn}
      </h2>
      <p className="font-mono text-[8px] tracking-[0.15em] text-[#c8955a]/55 mb-1 uppercase">
        {lang === 'zh' ? node.titleEn : node.title}
      </p>
      <p className="font-mono text-[9px] text-[#f0ede8]/40 mb-3">
        {node.person} · {node.year}
      </p>
      <p className="text-[#f0ede8]/55 text-[11px] leading-relaxed mb-4">
        {lang === 'zh' ? node.description : node.descEn}
      </p>

      {node.influences.length > 0 && (
        <div className="mb-4">
          <p className="font-mono text-[7px] tracking-[0.2em] text-[#f0ede8]/22 uppercase mb-1.5">
            {lang === 'zh' ? '影响了' : 'Influenced'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {node.influences.map((id) => {
              const n = NODE_MAP[id]
              if (!n) return null
              return (
                <button
                  key={id}
                  onClick={() => onSelect(n)}
                  className="font-mono text-[8px] px-2 py-0.5 border border-[#f0ede8]/12 text-[#f0ede8]/45 hover:text-[#f0ede8]/80 hover:border-[#f0ede8]/25 transition-colors duration-200"
                >
                  {lang === 'zh' ? n.title : n.titleEn}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {node.module && (
        <Link
          href={`/module/${node.module}`}
          className="flex items-center gap-2 font-mono text-[8px] tracking-[0.18em] uppercase text-[#c8955a]/70 hover:text-[#c8955a] transition-colors duration-200 border border-[#c8955a]/20 hover:border-[#c8955a]/40 px-3 py-2"
        >
          <span>→</span>
          <span>{lang === 'zh' ? '打开交互模块' : 'Open interactive module'}</span>
        </Link>
      )}
    </div>
  )
}

'use client'
// ── TheoryTree ─────────────────────────────────────────────────────────────
// SVG-based interactive physics theory timeline — vertical layout.
// Time flows top → bottom (1680 → 2005). Categories in columns left → right.
// Pan: drag · Zoom: scroll (cursor-centred) / pinch · Click: node detail.

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { NODES, NODE_MAP, CAT_CONFIG, type TheoryNode, type Category } from '@/core/theory-tree/data'
import { useLang } from '@/core/i18n'

// ── Layout constants ───────────────────────────────────────────────────────

const YEAR_START  = 1680
const YEAR_END    = 2005
const YEAR_RANGE  = YEAR_END - YEAR_START
const PX_PER_YEAR = 5.0      // vertical density
const LANE_W      = 150      // horizontal spacing between category columns
const NODE_R      = 18       // node circle radius
const CANVAS_H    = YEAR_RANGE * PX_PER_YEAR + 200   // ≈ 1825px tall
const CANVAS_W    = 6 * LANE_W + 100                  // 6 columns

// Map a year to SVG y (top = 1680, bottom = 2005)
const yx = (year: number) => ((year - YEAR_START) / YEAR_RANGE) * (CANVAS_H - 160) + 80

// Map a lane index to SVG x (left → right)
const lx = (lane: number) => 60 + lane * LANE_W

// ── Node layout ───────────────────────────────────────────────────────────

interface NodePos { node: TheoryNode; x: number; y: number }

const NODE_POS: NodePos[] = NODES.map((node) => ({
  node,
  x: lx(CAT_CONFIG[node.category].lane),
  y: yx(node.year),
}))

const POS_MAP: Record<string, NodePos> = Object.fromEntries(NODE_POS.map((np) => [np.node.id, np]))

// ── Edge paths (cubic bezier, vertical) ──────────────────────────────────

interface Edge { from: string; to: string; color: string }

const EDGES: Edge[] = []
for (const node of NODES) {
  for (const toId of node.influences) {
    if (POS_MAP[toId]) EDGES.push({ from: node.id, to: toId, color: CAT_CONFIG[node.category].color })
  }
}

function edgePath(from: NodePos, to: NodePos): string {
  const my = (from.y + to.y) / 2
  return `M${from.x},${from.y} C${from.x},${my} ${to.x},${my} ${to.x},${to.y}`
}

// ── Component ─────────────────────────────────────────────────────────────

export default function TheoryTree() {
  const svgRef   = useRef<SVGSVGElement>(null)
  const { lang } = useLang()

  // Pan + zoom state — initial view centred on the timeline
  const [tx, setTx] = useState(20)
  const [ty, setTy] = useState(-30)
  const [sc, setSc] = useState(0.55)

  const panRef    = useRef<{ startX: number; startY: number; tx: number; ty: number } | null>(null)
  const lastPinch = useRef<number | null>(null)

  // Selected node
  const [selected, setSelected] = useState<TheoryNode | null>(null)

  // ── Pan (mouse) ──────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('.node-hit')) return
    panRef.current = { startX: e.clientX, startY: e.clientY, tx, ty }
  }, [tx, ty])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!panRef.current) return
    setTx(panRef.current.tx + (e.clientX - panRef.current.startX))
    setTy(panRef.current.ty + (e.clientY - panRef.current.startY))
  }, [])

  const onMouseUp = useCallback(() => { panRef.current = null }, [])

  // ── Scroll zoom — cursor-centred ─────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.10 : 1 / 1.10
    const oldSc  = sc
    const newSc  = Math.max(0.22, Math.min(3.0, oldSc * factor))

    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) { setSc(newSc); return }

    // Keep the SVG point under the cursor stationary
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setTx(mx - (mx - tx) * newSc / oldSc)
    setTy(my - (my - ty) * newSc / oldSc)
    setSc(newSc)
  }, [tx, ty, sc])

  // ── Touch events ─────────────────────────────────────────────────────────
  useEffect(() => {
    const el = svgRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0]
        panRef.current = { startX: t.clientX, startY: t.clientY, tx, ty }
        lastPinch.current = null
      } else if (e.touches.length === 2) {
        panRef.current = null
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinch.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && panRef.current) {
        const t = e.touches[0]
        setTx(panRef.current.tx + (t.clientX - panRef.current.startX))
        setTy(panRef.current.ty + (t.clientY - panRef.current.startY))
      } else if (e.touches.length === 2 && lastPinch.current) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX
        const dy   = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        setSc((s) => Math.max(0.22, Math.min(3.0, s * (dist / lastPinch.current!))))
        lastPinch.current = dist
      }
    }

    const onTouchEnd = () => { panRef.current = null; lastPinch.current = null }

    el.addEventListener('touchstart', onTouchStart, { passive: false })
    el.addEventListener('touchmove',  onTouchMove,  { passive: false })
    el.addEventListener('touchend',   onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove',  onTouchMove)
      el.removeEventListener('touchend',   onTouchEnd)
    }
  }, [tx, ty])

  // ── Render ────────────────────────────────────────────────────────────────
  const transform = `translate(${tx}px, ${ty}px) scale(${sc})`

  return (
    <div className="w-full h-full relative select-none overflow-hidden bg-[#040404]">

      {/* ── SVG canvas ── */}
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <g style={{ transform, transformOrigin: '0 0', transition: 'none' }}>

          {/* ── Column backgrounds ── */}
          {Object.entries(CAT_CONFIG).map(([cat, cfg]) => (
            <rect
              key={cat}
              x={lx(cfg.lane) - LANE_W / 2} y={0}
              width={LANE_W} height={CANVAS_H}
              fill={cfg.color}
              fillOpacity={0.035}
            />
          ))}

          {/* ── Year gridlines (horizontal) ── */}
          {[1700, 1800, 1850, 1900, 1925, 1950, 1975, 2000].map((yr) => (
            <g key={yr}>
              <line
                x1={0} y1={yx(yr)} x2={CANVAS_W} y2={yx(yr)}
                stroke="#f0ede8" strokeOpacity={0.06} strokeWidth={1}
              />
              <text
                x={8} y={yx(yr) - 4}
                fill="#f0ede8" fillOpacity={0.28}
                fontSize={9} fontFamily="monospace"
              >
                {yr}
              </text>
            </g>
          ))}

          {/* ── Category column labels (at top) ── */}
          {Object.entries(CAT_CONFIG).map(([cat, cfg]) => (
            <text
              key={cat}
              x={lx(cfg.lane)} y={36}
              fill={cfg.color} fillOpacity={0.65}
              fontSize={8} fontFamily="monospace"
              letterSpacing="0.14em"
              textAnchor="middle"
            >
              {lang === 'zh' ? cfg.label : cfg.labelEn}
            </text>
          ))}

          {/* ── Edges ── */}
          {EDGES.map((e) => {
            const f = POS_MAP[e.from], t = POS_MAP[e.to]
            if (!f || !t) return null
            return (
              <path
                key={`${e.from}-${e.to}`}
                d={edgePath(f, t)}
                fill="none"
                stroke={e.color}
                strokeOpacity={0.24}
                strokeWidth={1.5}
              />
            )
          })}

          {/* ── Nodes ── */}
          {NODE_POS.map(({ node, x, y }) => {
            const cfg      = CAT_CONFIG[node.category]
            const isActive = selected?.id === node.id
            const hasModule = !!node.module
            const label    = lang === 'zh' ? node.title : node.titleEn

            return (
              <g
                key={node.id}
                className="node-hit"
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); setSelected(selected?.id === node.id ? null : node) }}
              >
                {isActive && (
                  <circle cx={x} cy={y} r={NODE_R + 6} fill={cfg.color} fillOpacity={0.18} />
                )}
                {hasModule && (
                  <circle cx={x} cy={y} r={NODE_R + 3}
                    fill="none" stroke={cfg.color} strokeOpacity={0.5} strokeWidth={1.2}
                    strokeDasharray="3 3" />
                )}
                <circle
                  cx={x} cy={y} r={NODE_R}
                  fill={isActive ? cfg.color : '#0d0d0d'}
                  stroke={cfg.color}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeOpacity={isActive ? 1 : 0.7}
                />
                <text x={x} y={y - 2}
                  fill={isActive ? '#040404' : cfg.color}
                  fillOpacity={isActive ? 1 : 0.88}
                  fontSize={7} textAnchor="middle" fontFamily="monospace">
                  {node.year}
                </text>
                <text x={x} y={y + 9}
                  fill={isActive ? '#040404' : '#f0ede8'}
                  fillOpacity={isActive ? 0.9 : 0.30}
                  fontSize={5} textAnchor="middle" fontFamily="monospace">
                  {node.person.split(' · ')[0]}
                </text>
                {/* Title to the right of the node */}
                <text
                  x={x + NODE_R + 5} y={y + 4}
                  fill={isActive ? cfg.color : '#f0ede8'}
                  fillOpacity={isActive ? 1 : 0.52}
                  fontSize={8} textAnchor="start"
                  fontWeight={isActive ? 'bold' : 'normal'}
                >
                  {label.length > 16 ? label.slice(0, 15) + '…' : label}
                </text>
              </g>
            )
          })}

        </g>
      </svg>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="absolute top-4 right-4 w-72 bg-[#0a0a0c] border border-[#f0ede8]/10 p-5 shadow-2xl">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-3 right-4 text-[#f0ede8]/30 hover:text-[#f0ede8]/60 text-lg leading-none"
          >✕</button>

          <span
            className="font-mono text-[7px] tracking-[0.2em] uppercase px-2 py-0.5 mb-3 inline-block"
            style={{
              color:           CAT_CONFIG[selected.category].color,
              border:          `1px solid ${CAT_CONFIG[selected.category].color}44`,
              backgroundColor: `${CAT_CONFIG[selected.category].color}11`,
            }}
          >
            {lang === 'zh' ? CAT_CONFIG[selected.category].label : CAT_CONFIG[selected.category].labelEn}
          </span>

          <h2 className="font-display font-light text-[20px] leading-tight text-[#f0ede8] mb-1">
            {lang === 'zh' ? selected.title : selected.titleEn}
          </h2>
          <p className="font-mono text-[8px] tracking-[0.15em] text-[#c8955a]/55 mb-1 uppercase">
            {lang === 'zh' ? selected.titleEn : selected.title}
          </p>
          <p className="font-mono text-[9px] text-[#f0ede8]/40 mb-3">
            {selected.person} · {selected.year}
          </p>
          <p className="text-[#f0ede8]/55 text-[11px] leading-relaxed mb-4">
            {lang === 'zh' ? selected.description : selected.descEn}
          </p>

          {selected.influences.length > 0 && (
            <div className="mb-4">
              <p className="font-mono text-[7px] tracking-[0.2em] text-[#f0ede8]/22 uppercase mb-1.5">
                {lang === 'zh' ? '影响了' : 'Influenced'}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.influences.map((id) => {
                  const n = NODE_MAP[id]
                  if (!n) return null
                  return (
                    <button key={id} onClick={() => setSelected(n)}
                      className="font-mono text-[8px] px-2 py-0.5 border border-[#f0ede8]/12 text-[#f0ede8]/45 hover:text-[#f0ede8]/80 hover:border-[#f0ede8]/25 transition-colors duration-200">
                      {lang === 'zh' ? n.title : n.titleEn}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selected.module && (
            <Link href={`/module/${selected.module}`}
              className="flex items-center gap-2 font-mono text-[8px] tracking-[0.18em] uppercase text-[#c8955a]/70 hover:text-[#c8955a] transition-colors duration-200 border border-[#c8955a]/20 hover:border-[#c8955a]/40 px-3 py-2">
              <span>→</span>
              <span>{lang === 'zh' ? '打开交互模块' : 'Open interactive module'}</span>
            </Link>
          )}
        </div>
      )}

      {/* ── Legend ── */}
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
          <span className="font-mono text-[7px] text-[#f0ede8]/20">- - -</span>
          <span className="font-mono text-[7px] text-[#f0ede8]/22">
            {lang === 'zh' ? '有交互模块' : 'has interactive module'}
          </span>
        </div>
      </div>

    </div>
  )
}

'use client'
// ─────────────────────────────────────────────
//  <ModuleViewer>
//  Full-screen canvas for any PhysicsModule.
//  Controls: hover bottom of canvas → auto-show panel.
//            click toggle strip → lock open/closed.
//  Mouse: drag to interact · scroll to zoom · double-click to reset
//  Touch: single-finger drag · pinch to zoom · double-tap to reset
// ─────────────────────────────────────────────

import { useRef, useState, useEffect, useCallback } from 'react'
import type { PhysicsModule, Params, ControlDefinition } from '@/types/physics'
import { useModuleRunner } from '@/core/renderer/useModuleRunner'
import { useLang } from '@/core/i18n'
import { MODULE_DESCRIPTIONS } from '@/core/module-descriptions'
import { GLOSSARY_MAP, type GlossaryTerm } from '@/core/glossary'

// ── Rich-text helpers ─────────────────────────────────────────────────────────

type Segment = { type: 'text'; text: string } | { type: 'term'; display: string; id: string }

function parseRichText(text: string): Segment[] {
  const segs: Segment[] = []
  const re = /\[([^\]|]+)\|([^\]]+)\]/g
  let last = 0; let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', text: text.slice(last, m.index) })
    segs.push({ type: 'term', display: m[1], id: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ type: 'text', text: text.slice(last) })
  return segs
}

function RichText({ text, onTerm }: { text: string; onTerm: (id: string) => void }) {
  return (
    <>
      {parseRichText(text).map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); onTerm(seg.id) }}
            className="text-[#c8955a]/80 underline decoration-dotted underline-offset-2 hover:text-[#c8955a] transition-colors duration-150"
          >
            {seg.display}
          </button>
        )
      )}
    </>
  )
}

function GlossaryCard({ term, lang, onClose }: { term: GlossaryTerm; lang: string; onClose: () => void }) {
  return (
    <div className="bg-[#0a0a18] border border-[#c8955a]/22 p-4 mb-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <span className="font-mono text-[10px] text-[#c8955a] tracking-[0.12em]">
            {lang === 'zh' ? term.zh : term.en}
          </span>
          <span className="font-mono text-[9px] text-[#f0ede8]/22 ml-2">
            {lang === 'zh' ? term.en : term.zh}
          </span>
        </div>
        <button onClick={onClose} className="text-[#f0ede8]/22 hover:text-[#f0ede8]/55 text-xs leading-none flex-shrink-0">✕</button>
      </div>
      <p className="text-[#f0ede8]/55 text-[11px] leading-relaxed mb-2">
        {lang === 'zh' ? term.defZh : term.defEn}
      </p>
      {term.formula && (
        <p className="font-mono text-[10px] text-[#c8955a]/65 bg-[#c8955a]/06 px-3 py-2 mb-2">
          {term.formula}
        </p>
      )}
      <a
        href={`https://en.wikipedia.org/wiki/${term.wikiEn}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="font-mono text-[8px] tracking-[0.15em] text-[#c8955a]/38 hover:text-[#c8955a]/70 uppercase transition-colors duration-150"
      >
        Wikipedia →
      </a>
    </div>
  )
}

// ── Section helper ────────────────────────────────────────────────────────────

function InfoSection({ label, text, onTerm }: { label: string; text: string; onTerm: (id: string) => void }) {
  return (
    <div className="mb-5">
      <p className="font-mono text-[7px] tracking-[0.22em] text-[#f0ede8]/22 uppercase mb-2">{label}</p>
      <p className="text-[#f0ede8]/58 text-[12px] leading-relaxed">
        <RichText text={text} onTerm={onTerm} />
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

interface Props { mod: PhysicsModule }

function buildDefaultParams(controls: ControlDefinition[]): Params {
  const p: Params = {}
  for (const c of controls) {
    if (c.type !== 'button' && c.type !== 'body-selector') p[c.id] = c.default
  }
  return p
}

export default function ModuleViewer({ mod }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controls  = mod.getControls()
  const [params, setParams]       = useState<Params>(() => buildDefaultParams(controls))
  const [controlsOpen, setControlsOpen]     = useState(false)
  const [controlsLocked, setControlsLocked] = useState(false)
  const [infoOpen, setInfoOpen]             = useState(false)
  const [activeTerm, setActiveTerm]         = useState<string | null>(null)
  const { lang } = useLang()

  const closeInfo = useCallback(() => { setInfoOpen(false); setActiveTerm(null) }, [])

  // ── View state: pan / zoom / mouse ─────────────────────────────────────────
  const viewRef       = useRef<Params>({ _panX: 0, _panY: 0, _zoom: 1, _mouseX: -1, _mouseY: -1, _dragging: false, _scrollAccum: 0 })
  const isDragging    = useRef(false)
  const dragStart     = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0, dpr: 1 })
  const lastPinchDist = useRef<number | null>(null)

  // ── Controls hover logic ────────────────────────────────────────────────────
  // Refs so event handlers can read current values without stale closures
  const controlsLockedRef  = useRef(false)
  const controlsHideTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep ref in sync with state
  useEffect(() => { controlsLockedRef.current = controlsLocked }, [controlsLocked])

  // Stable function refs — updated every render, safe to call from event handlers
  const openControlsFnRef  = useRef<() => void>(() => {})
  const closeControlsFnRef = useRef<() => void>(() => {})

  openControlsFnRef.current = useCallback(() => {
    if (controlsHideTimer.current) clearTimeout(controlsHideTimer.current)
    setControlsOpen(true)
  }, [])

  closeControlsFnRef.current = useCallback(() => {
    if (controlsLockedRef.current) return
    if (controlsHideTimer.current) clearTimeout(controlsHideTimer.current)
    controlsHideTimer.current = setTimeout(() => setControlsOpen(false), 700)
  }, [])

  // Clean up timer on unmount
  useEffect(() => () => {
    if (controlsHideTimer.current) clearTimeout(controlsHideTimer.current)
  }, [])

  const { running, setRunning, reset } = useModuleRunner(mod, canvasRef, params, viewRef)

  // Reset view & controls whenever the module changes
  useEffect(() => {
    viewRef.current    = { _panX: 0, _panY: 0, _zoom: 1, _mouseX: -1, _mouseY: -1, _dragging: false, _scrollAccum: 0 }
    isDragging.current = false
    lastPinchDist.current = null
    setControlsOpen(false)
    setControlsLocked(false)
  }, [mod])

  // ── Canvas mouse / touch events ────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.style.cursor = 'crosshair'

    const toCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const dpr  = canvas.width / rect.width
      return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr, dpr, relY: (clientY - rect.top) / rect.height }
    }

    // ── Mouse ──────────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const { x, y, relY } = toCanvas(e.clientX, e.clientY)
      viewRef.current._mouseX = x
      viewRef.current._mouseY = y

      // Show controls when near bottom 22% of canvas.
      // Hysteresis: only close when clearly above the zone (< 0.68) to prevent
      // flickering when moving a slider while hovering near the boundary.
      if (relY > 0.78) {
        openControlsFnRef.current()
      } else if (relY < 0.68) {
        closeControlsFnRef.current()
      }

      if (isDragging.current) {
        const { dpr, clientX, clientY, panX, panY } = dragStart.current
        viewRef.current._panX = panX + (e.clientX - clientX) * dpr
        viewRef.current._panY = panY + (e.clientY - clientY) * dpr
      }
    }

    const onMouseDown = (e: MouseEvent) => {
      const { dpr } = toCanvas(e.clientX, e.clientY)
      isDragging.current         = true
      viewRef.current._dragging  = true
      dragStart.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        panX: viewRef.current._panX as number,
        panY: viewRef.current._panY as number,
        dpr,
      }
      canvas.style.cursor = 'grabbing'
    }

    const onMouseUp = () => {
      isDragging.current        = false
      viewRef.current._dragging = false
      canvas.style.cursor       = 'crosshair'
    }

    const onMouseLeave = () => {
      isDragging.current        = false
      viewRef.current._dragging = false
      viewRef.current._mouseX   = -1
      viewRef.current._mouseY   = -1
      canvas.style.cursor       = 'crosshair'
      closeControlsFnRef.current()
    }

    const onDblClick = () => {
      viewRef.current._panX = 0
      viewRef.current._panY = 0
      viewRef.current._zoom = 1
      viewRef.current._scrollAccum = 0
    }

    const applyZoom = (factor: number, clientX: number, clientY: number) => {
      const oldZoom = viewRef.current._zoom as number
      const newZoom = Math.max(0.3, Math.min(12, oldZoom * factor))
      const { x: mx, y: my } = toCanvas(clientX, clientY)
      const base    = Math.min(canvas.width, canvas.height) * 0.88
      const oldSz   = base * oldZoom
      const newSz   = base * newZoom
      const oldPanX = viewRef.current._panX as number
      const oldPanY = viewRef.current._panY as number
      const oldOx   = (canvas.width  - oldSz) / 2 + oldPanX
      const oldOy   = (canvas.height - oldSz) / 2 + oldPanY
      const fracX   = (mx - oldOx) / oldSz
      const fracY   = (my - oldOy) / oldSz
      viewRef.current._zoom  = newZoom
      viewRef.current._panX  = mx - fracX * newSz - (canvas.width  - newSz) / 2
      viewRef.current._panY  = my - fracY * newSz - (canvas.height - newSz) / 2
      viewRef.current._mouseX = mx
      viewRef.current._mouseY = my
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      viewRef.current._scrollAccum = ((viewRef.current._scrollAccum as number) ?? 0) + e.deltaY
      applyZoom(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY)
    }

    // ── Touch ──────────────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1) {
        const t = e.touches[0]
        const { dpr } = toCanvas(t.clientX, t.clientY)
        isDragging.current        = true
        viewRef.current._dragging = true
        dragStart.current = {
          clientX: t.clientX,
          clientY: t.clientY,
          panX: viewRef.current._panX as number,
          panY: viewRef.current._panY as number,
          dpr,
        }
        lastPinchDist.current = null
      } else if (e.touches.length === 2) {
        isDragging.current        = false
        viewRef.current._dragging = false
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isDragging.current) {
        const t = e.touches[0]
        const { dpr, clientX, clientY, panX, panY } = dragStart.current
        viewRef.current._panX = panX + (t.clientX - clientX) * dpr
        viewRef.current._panY = panY + (t.clientY - clientY) * dpr
      } else if (e.touches.length === 2) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX
        const dy   = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (lastPinchDist.current !== null && lastPinchDist.current > 0) {
          const factor = dist / lastPinchDist.current
          const midX   = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const midY   = (e.touches[0].clientY + e.touches[1].clientY) / 2
          applyZoom(factor, midX, midY)
        }
        lastPinchDist.current = dist
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isDragging.current        = false
        viewRef.current._dragging = false
        lastPinchDist.current     = null
      }
    }

    canvas.addEventListener('mousemove',  onMouseMove)
    canvas.addEventListener('mousedown',  onMouseDown)
    canvas.addEventListener('mouseup',    onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('dblclick',   onDblClick)
    canvas.addEventListener('wheel',      onWheel, { passive: false })
    canvas.addEventListener('touchstart', onTouchStart, { passive: false })
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false })
    canvas.addEventListener('touchend',   onTouchEnd,   { passive: false })

    return () => {
      canvas.removeEventListener('mousemove',  onMouseMove)
      canvas.removeEventListener('mousedown',  onMouseDown)
      canvas.removeEventListener('mouseup',    onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('dblclick',   onDblClick)
      canvas.removeEventListener('wheel',      onWheel)
      canvas.removeEventListener('touchstart', onTouchStart)
      canvas.removeEventListener('touchmove',  onTouchMove)
      canvas.removeEventListener('touchend',   onTouchEnd)
      canvas.style.cursor = ''
    }
  }, [mod])

  const setParam = (id: string, value: number | boolean | string) =>
    setParams((p) => ({ ...p, [id]: value }))

  const ctrlLabel = (ctrl: ControlDefinition) =>
    lang === 'en' && ctrl.labelEn ? ctrl.labelEn : ctrl.label

  const handleControlsClick = () => {
    if (controlsLocked) {
      // Unlock — will close on next mouse-leave
      setControlsLocked(false)
    } else {
      // Lock open
      setControlsLocked(true)
      setControlsOpen(true)
    }
  }

  return (
    <div className="absolute inset-0 bg-[#040404]">

      {/* ── Canvas fills everything ── */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* ── Play / Pause — top-right corner ── */}
      <button
        onClick={() => setRunning(!running)}
        className="absolute top-4 right-4 z-10 font-mono text-[9px] tracking-[0.18em] uppercase text-[#f0ede8]/30 hover:text-[#f0ede8]/60 transition-colors duration-300"
      >
        {running ? '⏸ Pause' : '▶ Resume'}
      </button>

      {/* ── Info button — sits right of the hamburger (which occupies top-4 left-4) ── */}
      <button
        onClick={() => setInfoOpen(true)}
        className="absolute top-4 left-12 z-20 h-7 px-2.5 flex items-center gap-1.5 font-mono text-[9px] tracking-[0.12em] text-[#f0ede8]/45 hover:text-[#f0ede8]/80 border border-[#f0ede8]/18 hover:border-[#c8955a]/50 hover:text-[#c8955a]/80 transition-colors duration-300 uppercase"
      >
        <span className="text-[10px] leading-none">ⓘ</span>
        <span>{lang === 'zh' ? '解释' : 'Info'}</span>
      </button>

      {/* ── Info / Explanation popup ── */}
      {infoOpen && (() => {
        const desc = MODULE_DESCRIPTIONS[mod.id]
        const handleTerm = (id: string) => {
          if (!GLOSSARY_MAP[id]) return
          setActiveTerm((prev) => (prev === id ? null : id))
        }
        return (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-[#020208]/60 backdrop-blur-sm"
            onClick={closeInfo}
          >
            <div
              className="bg-[#07070f]/97 border border-[#f0ede8]/10 max-w-lg w-full mx-4 shadow-2xl relative flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={closeInfo}
                className="absolute top-3 right-4 z-10 text-[#f0ede8]/30 hover:text-[#f0ede8]/65 text-lg leading-none transition-colors"
              >✕</button>

              {/* Scrollable body */}
              <div className="overflow-y-auto p-6 flex-1">

                {/* Theory tags */}
                <p className="font-mono text-[7px] tracking-[0.22em] text-[#c8955a]/55 uppercase mb-3">
                  {mod.metadata.theory?.join(' · ')}
                </p>

                {/* Title */}
                <h2 className="font-display font-light text-[22px] leading-tight text-[#f0ede8] mb-1">
                  {lang === 'zh' ? mod.metadata.title : mod.metadata.titleEn}
                </h2>
                <p className="font-mono text-[8px] tracking-[0.14em] text-[#c8955a]/45 mb-5 uppercase">
                  {lang === 'zh' ? mod.metadata.titleEn : mod.metadata.title}
                </p>

                {/* Glossary card (shown when a term link is clicked) */}
                {activeTerm && GLOSSARY_MAP[activeTerm] && (
                  <GlossaryCard
                    term={GLOSSARY_MAP[activeTerm]}
                    lang={lang}
                    onClose={() => setActiveTerm(null)}
                  />
                )}

                {/* Structured sections */}
                {desc ? (
                  <>
                    <InfoSection
                      label={lang === 'zh' ? '你看到了什么' : 'What You See'}
                      text={lang === 'zh' ? desc.whatYouSee.zh : desc.whatYouSee.en}
                      onTerm={handleTerm}
                    />
                    <InfoSection
                      label={lang === 'zh' ? '背后的物理' : 'The Physics'}
                      text={lang === 'zh' ? desc.physics.zh : desc.physics.en}
                      onTerm={handleTerm}
                    />
                    {desc.equation && (
                      <div className="font-mono text-[11px] text-[#c8955a]/70 bg-[#c8955a]/05 border border-[#c8955a]/14 px-4 py-3 mb-5 break-all">
                        {desc.equation}
                      </div>
                    )}
                    <InfoSection
                      label={lang === 'zh' ? '历史背景' : 'Historical Context'}
                      text={lang === 'zh' ? desc.history.zh : desc.history.en}
                      onTerm={handleTerm}
                    />
                  </>
                ) : (
                  /* Fallback for modules without structured descriptions */
                  <p className="text-[#f0ede8]/58 text-[12px] leading-relaxed mb-5">
                    {lang === 'zh'
                      ? mod.metadata.description
                      : (mod.metadata.descriptionEn ?? mod.metadata.description)}
                  </p>
                )}

                {/* Interaction hint */}
                <div className="border-t border-[#f0ede8]/7 pt-4">
                  <p className="font-mono text-[7px] tracking-[0.18em] text-[#f0ede8]/22 uppercase mb-2">
                    {lang === 'zh' ? '互动方式' : 'How to interact'}
                  </p>
                  <p className="font-mono text-[9px] text-[#f0ede8]/35 leading-relaxed">
                    {lang === 'zh'
                      ? '拖曳旋转视角 · 滚轮缩放 · 双击重置 · 底部控制面板调整参数'
                      : 'Drag to rotate · Scroll to zoom · Double-click to reset · Hover bottom for controls'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Controls — hover-triggered bottom panel ── */}
      {controls.length > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 z-10"
          onMouseEnter={() => openControlsFnRef.current()}
          onMouseLeave={() => closeControlsFnRef.current()}
        >
          {/* Toggle / lock strip */}
          <button
            onClick={handleControlsClick}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#030610]/75 backdrop-blur-md font-mono text-[9px] tracking-[0.18em] uppercase text-[#f0ede8]/28 hover:text-[#f0ede8]/55 transition-colors duration-300"
          >
            <span>{controlsLocked ? '◈' : controlsOpen ? '▼' : '▲'}</span>
            <span>{lang === 'en' ? 'Controls' : '控制'}</span>
            {controlsLocked && (
              <span className="ml-1 text-[#c8955a]/50 text-[8px]">
                {lang === 'en' ? 'locked' : '已锁定'}
              </span>
            )}
            {!controlsOpen && !controlsLocked && (
              <span className="ml-3 text-[#f0ede8]/13 text-[8px] hidden sm:inline tracking-[0.1em]">
                {lang === 'en' ? 'hover · click to lock' : '移入展开 · 点击锁定'}
              </span>
            )}
          </button>

          {/* Controls panel */}
          {controlsOpen && (
            <div className="bg-[#030610]/85 backdrop-blur-md px-6 py-5 border-t border-[#f0ede8]/7">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-5 max-w-2xl mx-auto">
                {controls.map((ctrl) => {

                  if (ctrl.type === 'slider') return (
                    <label key={ctrl.id} className="flex flex-col gap-2">
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/35 uppercase">
                          {ctrlLabel(ctrl)}
                        </span>
                        <span className="font-mono text-[10px] text-[#c8955a]/70">
                          {typeof params[ctrl.id] === 'number'
                            ? (params[ctrl.id] as number).toFixed(2)
                            : params[ctrl.id]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={ctrl.min} max={ctrl.max} step={ctrl.step}
                        value={params[ctrl.id] as number}
                        onChange={(e) => setParam(ctrl.id, parseFloat(e.target.value))}
                      />
                    </label>
                  )

                  if (ctrl.type === 'toggle') return (
                    <label key={ctrl.id} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={params[ctrl.id] as boolean}
                        onChange={(e) => setParam(ctrl.id, e.target.checked)}
                        className="accent-[#c8955a] w-3 h-3"
                      />
                      <span className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/35 uppercase">
                        {ctrlLabel(ctrl)}
                      </span>
                    </label>
                  )

                  if (ctrl.type === 'select') return (
                    <label key={ctrl.id} className="flex flex-col gap-2">
                      <span className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/35 uppercase">
                        {ctrlLabel(ctrl)}
                      </span>
                      <select
                        value={params[ctrl.id] as string}
                        onChange={(e) => setParam(ctrl.id, e.target.value)}
                        className="bg-transparent text-[#f0ede8]/60 font-mono text-[10px] border-b border-[#f0ede8]/12 pb-1 focus:outline-none focus:border-[#c8955a]/40 cursor-pointer transition-colors duration-200"
                      >
                        {ctrl.options.map((opt) => (
                          <option key={opt.value} value={opt.value} className="bg-[#0d0d0b] text-[#f0ede8]">
                            {lang === 'en' && opt.labelEn ? opt.labelEn : opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )

                  if (ctrl.type === 'button') return (
                    <button
                      key={ctrl.id}
                      onClick={reset}
                      className="col-span-2 sm:col-span-3 font-mono text-[9px] tracking-[0.2em] uppercase text-[#f0ede8]/30 hover:text-[#f0ede8]/60 border border-[#f0ede8]/7 hover:border-[#f0ede8]/14 py-2.5 transition-colors duration-300"
                    >
                      {ctrlLabel(ctrl)}
                    </button>
                  )

                  return null
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

'use client'
// ─────────────────────────────────────────────
//  <ModuleViewer>
//  Wraps any PhysicsModule: canvas + auto-generated controls
//  Mouse: drag to pan · scroll to zoom · double-click to reset
//  Touch: single-finger drag to pan · pinch to zoom · double-tap to reset
// ─────────────────────────────────────────────

import { useRef, useState, useEffect } from 'react'
import type { PhysicsModule, Params, ControlDefinition } from '@/types/physics'
import { useModuleRunner } from '@/core/renderer/useModuleRunner'
import { useLang } from '@/core/i18n'

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
  const [params, setParams] = useState<Params>(() => buildDefaultParams(controls))
  const { lang } = useLang()

  // ── View state: pan / zoom / mouse ─────────────────────────────────────────
  const viewRef    = useRef<Params>({ _panX: 0, _panY: 0, _zoom: 1, _mouseX: -1, _mouseY: -1, _dragging: false })
  const isDragging = useRef(false)
  const dragStart  = useRef({ clientX: 0, clientY: 0, panX: 0, panY: 0, dpr: 1 })

  // Pinch-zoom tracking
  const lastPinchDist = useRef<number | null>(null)

  const { running, setRunning, reset } = useModuleRunner(mod, canvasRef, params, viewRef)

  // Reset view whenever the module changes
  useEffect(() => {
    viewRef.current    = { _panX: 0, _panY: 0, _zoom: 1, _mouseX: -1, _mouseY: -1, _dragging: false }
    isDragging.current = false
    lastPinchDist.current = null
  }, [mod])

  // ── Canvas mouse events ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.style.cursor = 'crosshair'

    const toCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const dpr  = canvas.width / rect.width
      return { x: (clientX - rect.left) * dpr, y: (clientY - rect.top) * dpr, dpr }
    }

    // ── Mouse ──────────────────────────────────────────────────────────────
    const onMouseMove = (e: MouseEvent) => {
      const { x, y } = toCanvas(e.clientX, e.clientY)
      viewRef.current._mouseX = x
      viewRef.current._mouseY = y
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
      dragStart.current  = {
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
    }

    const onDblClick = () => {
      viewRef.current._panX = 0
      viewRef.current._panY = 0
      viewRef.current._zoom = 1
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
        dragStart.current  = {
          clientX: t.clientX,
          clientY: t.clientY,
          panX: viewRef.current._panX as number,
          panY: viewRef.current._panY as number,
          dpr,
        }
        lastPinchDist.current = null
      } else if (e.touches.length === 2) {
        isDragging.current = false
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      if (e.touches.length === 1 && isDragging.current) {
        const t   = e.touches[0]
        const { dpr, clientX, clientY, panX, panY } = dragStart.current
        viewRef.current._panX = panX + (t.clientX - clientX) * dpr
        viewRef.current._panY = panY + (t.clientY - clientY) * dpr
      } else if (e.touches.length === 2) {
        const dx   = e.touches[0].clientX - e.touches[1].clientX
        const dy   = e.touches[0].clientY - e.touches[1].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (lastPinchDist.current !== null && lastPinchDist.current > 0) {
          const factor  = dist / lastPinchDist.current
          const midX    = (e.touches[0].clientX + e.touches[1].clientX) / 2
          const midY    = (e.touches[0].clientY + e.touches[1].clientY) / 2
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

  // Resolve bilingual label
  const ctrlLabel = (ctrl: ControlDefinition) =>
    lang === 'en' && ctrl.labelEn ? ctrl.labelEn : ctrl.label

  return (
    <div className="flex flex-col gap-6 w-full">

      {/* ── Canvas ── */}
      <div
        className="relative w-full overflow-hidden bg-[#040404]"
        style={{ aspectRatio: '16/9' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Play/Pause */}
        <button
          onClick={() => setRunning(!running)}
          className="absolute bottom-4 right-4 font-mono text-[9px] tracking-[0.18em] uppercase text-[#f0ede8]/35 hover:text-[#f0ede8]/65 transition-colors duration-300"
        >
          {running ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>

      {/* ── Interaction hint ── */}
      <p className="font-mono text-[9px] tracking-[0.12em] text-[#f0ede8]/18 text-center -mt-3">
        {lang === 'en'
          ? 'scroll / pinch to zoom · drag to pan · double-click to reset'
          : '滚轮/双指缩放 · 拖拽平移 · 双击重置'}
      </p>

      {/* ── Controls ── */}
      {controls.length > 0 && (
        <div className="border-t border-[#f0ede8]/7 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
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
                  className="col-span-1 sm:col-span-2 font-mono text-[9px] tracking-[0.2em] uppercase text-[#f0ede8]/30 hover:text-[#f0ede8]/60 border border-[#f0ede8]/7 hover:border-[#f0ede8]/14 py-2.5 transition-colors duration-300"
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
  )
}

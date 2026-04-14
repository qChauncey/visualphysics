'use client'
// ─────────────────────────────────────────────
//  <ModuleViewer>
//  Wraps any PhysicsModule: canvas + auto-generated controls
// ─────────────────────────────────────────────

import { useRef, useState } from 'react'
import type { PhysicsModule, Params, ControlDefinition } from '@/types/physics'
import { useModuleRunner } from '@/core/renderer/useModuleRunner'

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
  const { running, setRunning, reset } = useModuleRunner(mod, canvasRef, params)

  const setParam = (id: string, value: number | boolean | string) =>
    setParams((p) => ({ ...p, [id]: value }))

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
          className="absolute bottom-4 right-4 font-mono text-[9px] tracking-[0.18em] uppercase text-[#f0ede8]/35 hover:text-[#f0ede8]/65 transition-colors duration-300 px-0 py-0"
        >
          {running ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>

      {/* ── Controls ── */}
      {controls.length > 0 && (
        <div className="border-t border-[#f0ede8]/7 pt-6">
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {controls.map((ctrl) => {

              if (ctrl.type === 'slider') return (
                <label key={ctrl.id} className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/35 uppercase">
                      {ctrl.label}
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
                    {ctrl.label}
                  </span>
                </label>
              )

              if (ctrl.type === 'select') return (
                <label key={ctrl.id} className="flex flex-col gap-2">
                  <span className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/35 uppercase">
                    {ctrl.label}
                  </span>
                  <select
                    value={params[ctrl.id] as string}
                    onChange={(e) => setParam(ctrl.id, e.target.value)}
                    className="bg-transparent text-[#f0ede8]/60 font-mono text-[10px] border-b border-[#f0ede8]/12 pb-1 focus:outline-none focus:border-[#c8955a]/40 cursor-pointer transition-colors duration-200"
                  >
                    {ctrl.options.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#0d0d0b] text-[#f0ede8]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              )

              if (ctrl.type === 'button') return (
                <button
                  key={ctrl.id}
                  onClick={reset}
                  className="col-span-2 font-mono text-[9px] tracking-[0.2em] uppercase text-[#f0ede8]/30 hover:text-[#f0ede8]/60 border border-[#f0ede8]/7 hover:border-[#f0ede8]/14 py-2.5 transition-colors duration-300"
                >
                  {ctrl.label}
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

'use client'
// ─────────────────────────────────────────────
//  <ModuleViewer>
//  Wraps any PhysicsModule: canvas + auto-generated controls
// ─────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'
import type { PhysicsModule, Params, ControlDefinition } from '@/types/physics'
import { useModuleRunner } from '@/core/renderer/useModuleRunner'

interface Props {
  mod: PhysicsModule
}

function buildDefaultParams(controls: ControlDefinition[]): Params {
  const p: Params = {}
  for (const c of controls) {
    if (c.type !== 'button') p[c.id] = c.default
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
    <div className="flex flex-col gap-4 w-full h-full">
      {/* Canvas */}
      <div className="relative w-full rounded-xl overflow-hidden bg-[#0a0a14]" style={{ aspectRatio: '16/9' }}>
        <canvas ref={canvasRef} className="w-full h-full" />
        {/* Play/Pause overlay */}
        <button
          onClick={() => setRunning(!running)}
          className="absolute bottom-3 right-3 px-3 py-1 text-xs rounded-full bg-white/10 hover:bg-white/20 text-white/70 transition"
        >
          {running ? '⏸ 暂停' : '▶ 继续'}
        </button>
      </div>

      {/* Auto-generated controls */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {controls.map((ctrl) => {
          if (ctrl.type === 'slider') return (
            <label key={ctrl.id} className="flex flex-col gap-1">
              <span className="text-neutral-400 text-xs">{ctrl.label}
                <span className="ml-2 text-neutral-300 font-mono">
                  {typeof params[ctrl.id] === 'number'
                    ? (params[ctrl.id] as number).toFixed(2)
                    : params[ctrl.id]}
                </span>
              </span>
              <input
                type="range"
                min={ctrl.min} max={ctrl.max} step={ctrl.step}
                value={params[ctrl.id] as number}
                onChange={(e) => setParam(ctrl.id, parseFloat(e.target.value))}
                className="accent-blue-400"
              />
            </label>
          )
          if (ctrl.type === 'toggle') return (
            <label key={ctrl.id} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={params[ctrl.id] as boolean}
                onChange={(e) => setParam(ctrl.id, e.target.checked)}
                className="accent-blue-400"
              />
              <span className="text-neutral-300 text-xs">{ctrl.label}</span>
            </label>
          )
          if (ctrl.type === 'button') return (
            <button
              key={ctrl.id}
              onClick={reset}
              className="col-span-2 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-neutral-300 text-xs transition"
            >
              {ctrl.label}
            </button>
          )
          return null
        })}
      </div>
    </div>
  )
}

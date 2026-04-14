'use client'
// ─────────────────────────────────────────────
//  useModuleRunner
//  React hook that drives any PhysicsModule:
//  init → rAF loop (tick + render) → destroy
// ─────────────────────────────────────────────

import { useEffect, useRef, useState, useCallback } from 'react'
import type { PhysicsModule, Params } from '@/types/physics'

export function useModuleRunner(
  mod: PhysicsModule | null,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  params: Params
) {
  const stateRef   = useRef<unknown>(null)
  const paramsRef  = useRef<Params>(params)
  const rafRef     = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const [running, setRunning] = useState(true)

  // Keep params ref fresh without restarting the loop
  useEffect(() => { paramsRef.current = params }, [params])

  // Init + animation loop
  useEffect(() => {
    if (!mod || !canvasRef.current) return
    const canvas = canvasRef.current

    // Fit canvas to display size
    const resize = () => {
      canvas.width  = canvas.offsetWidth  * devicePixelRatio
      canvas.height = canvas.offsetHeight * devicePixelRatio
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    stateRef.current = mod.init(canvas, paramsRef.current)

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05)
      lastTimeRef.current = time

      if (running) {
        stateRef.current = mod.tick(stateRef.current as never, dt, paramsRef.current)
      }
      mod.render(stateRef.current as never, canvas, paramsRef.current)
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame((t) => {
      lastTimeRef.current = t
      rafRef.current = requestAnimationFrame(loop)
    })

    return () => {
      cancelAnimationFrame(rafRef.current)
      ro.disconnect()
      mod.destroy(canvas)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod])

  const reset = useCallback(() => {
    if (!mod || !canvasRef.current) return
    stateRef.current = mod.init(canvasRef.current, paramsRef.current)
  }, [mod, canvasRef])

  return { running, setRunning, reset }
}

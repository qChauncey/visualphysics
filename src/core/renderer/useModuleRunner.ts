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
  params: Params,
  /** Live-updated view state (pan/zoom/mouse) — merged into params each frame without React re-renders */
  viewRef?: React.MutableRefObject<Params>,
) {
  const stateRef    = useRef<unknown>(null)
  const paramsRef   = useRef<Params>(params)
  const runningRef  = useRef(true)
  const rafRef      = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const [running, setRunningState] = useState(true)

  // Wrap setRunning to also update the ref (avoids stale closure in the loop)
  const setRunning = useCallback((v: boolean) => {
    runningRef.current = v
    setRunningState(v)
  }, [])

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

      // Merge view state (pan/zoom/mouse) without triggering React renders
      const allParams: Params = viewRef
        ? { ...paramsRef.current, ...viewRef.current }
        : paramsRef.current

      if (runningRef.current) {
        stateRef.current = mod.tick(stateRef.current as never, dt, allParams)
      }
      mod.render(stateRef.current as never, canvas, allParams)
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

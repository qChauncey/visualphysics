'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { loadModule } from '@/core/registry'
import type { PhysicsModule } from '@/types/physics'
import ModuleViewer from '@/ui/components/ModuleViewer'
import Sidebar from '@/ui/components/Sidebar'

export default function ModulePage() {
  const { id } = useParams<{ id: string }>()
  const [mod, setMod]     = useState<PhysicsModule | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadModule(id)
      .then((m) => { if (!m) setError(true); else setMod(m) })
      .catch(() => setError(true))
  }, [id])

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div className="flex h-screen bg-[#080808] text-[#f0ede8] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <p className="font-mono text-xs text-[#f0ede8]/30">模块未找到：{id}</p>
      </main>
    </div>
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!mod) return (
    <div className="flex h-screen bg-[#080808] text-[#f0ede8] overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center">
        <span className="font-mono text-[10px] tracking-[0.2em] text-[#f0ede8]/20 uppercase animate-pulse">
          Loading…
        </span>
      </main>
    </div>
  )

  // ── Module ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-[#080808] text-[#f0ede8] overflow-hidden">

      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-10 pt-12 pb-20">

          {/* ── Header ── */}
          <div className="mb-10">
            <h1
              className="font-display font-light leading-[0.9] text-[#f0ede8] mb-2"
              style={{ fontSize: 'clamp(36px, 5vw, 72px)' }}
            >
              {mod.metadata.title}
            </h1>
            <p className="font-mono text-[9px] tracking-[0.22em] text-[#c8955a]/55 mb-4 uppercase">
              {mod.metadata.titleEn}
            </p>
            <p className="text-[#f0ede8]/38 text-[13px] leading-[1.75] max-w-lg mb-5">
              {mod.metadata.description}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {mod.metadata.theory.map((t) => (
                <span key={t} className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/22 uppercase">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-[#f0ede8]/7 mb-10" />

          {/* ── Module viewer ── */}
          <ModuleViewer mod={mod} />

        </div>
      </main>

    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { loadModule } from '@/core/registry'
import type { PhysicsModule } from '@/types/physics'
import ModuleViewer from '@/ui/components/ModuleViewer'

export default function ModulePage() {
  const { id } = useParams<{ id: string }>()
  const [mod, setMod] = useState<PhysicsModule | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadModule(id)
      .then((m) => { if (!m) setError(true); else setMod(m) })
      .catch(() => setError(true))
  }, [id])

  if (error) return (
    <div className="min-h-screen bg-[#080808] text-[#f0ede8] flex items-center justify-center">
      <div className="text-center">
        <p className="font-mono text-xs text-[#f0ede8]/30 mb-6">模块未找到：{id}</p>
        <Link href="/" className="font-mono text-[10px] tracking-[0.2em] text-[#c8955a]/60 hover:text-[#c8955a] transition-colors uppercase">
          ← Return
        </Link>
      </div>
    </div>
  )

  if (!mod) return (
    <div className="min-h-screen bg-[#080808] text-[#f0ede8] flex items-center justify-center">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#f0ede8]/20 uppercase animate-pulse">
        Loading…
      </span>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080808] text-[#f0ede8]">

      {/* ── Nav ── */}
      <nav className="max-w-5xl mx-auto px-8 pt-10">
        <Link
          href="/"
          className="font-mono text-[10px] tracking-[0.22em] text-[#f0ede8]/25 uppercase hover:text-[#f0ede8]/55 transition-colors duration-300"
        >
          ← Physics Visualization
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-8 pt-14 pb-16">

        {/* ── Header ── */}
        <div className="mb-12">
          <h1
            className="font-display font-light leading-[0.9] text-[#f0ede8] mb-3"
            style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
          >
            {mod.metadata.title}
          </h1>
          <p className="font-mono text-[9px] tracking-[0.22em] text-[#c8955a]/55 mb-5 uppercase">
            {mod.metadata.titleEn}
          </p>
          <p className="text-[#f0ede8]/38 text-[13px] leading-[1.75] max-w-lg mb-6">
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
        <div className="h-px bg-[#f0ede8]/7 mb-12" />

        {/* ── Module viewer ── */}
        <ModuleViewer mod={mod} />

      </div>
    </main>
  )
}

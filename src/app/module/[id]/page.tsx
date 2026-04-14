'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { loadModule } from '@/core/registry'
import type { PhysicsModule } from '@/types/physics'
import ModuleViewer from '@/ui/components/ModuleViewer'
import AppLayout from '@/ui/components/AppLayout'
import { useLang, UI } from '@/core/i18n'

export default function ModulePage() {
  const { id } = useParams<{ id: string }>()
  const [mod, setMod]     = useState<PhysicsModule | null>(null)
  const [error, setError] = useState(false)
  const { lang }          = useLang()
  const t                 = UI[lang]

  useEffect(() => {
    loadModule(id)
      .then((m) => { if (!m) setError(true); else setMod(m) })
      .catch(() => setError(true))
  }, [id])

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <AppLayout mainClassName="flex-1 flex items-center justify-center">
      <p className="font-mono text-xs text-[#f0ede8]/30">{t.notFound}{id}</p>
    </AppLayout>
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!mod) return (
    <AppLayout mainClassName="flex-1 flex items-center justify-center">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#f0ede8]/20 uppercase animate-pulse">
        {t.loading}
      </span>
    </AppLayout>
  )

  // Prefer English metadata when lang=en and fields exist
  const title       = lang === 'en' && mod.metadata.titleEn       ? mod.metadata.titleEn       : mod.metadata.title
  const subtitle    = lang === 'en'                                ? mod.metadata.title          : mod.metadata.titleEn
  const description = lang === 'en' && mod.metadata.descriptionEn ? mod.metadata.descriptionEn : mod.metadata.description

  // ── Module ────────────────────────────────────────────────────────────────
  return (
    <AppLayout mainClassName="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-5 sm:px-10 pt-14 sm:pt-12 pb-20">

        {/* ── Header ── */}
        <div className="mb-10">
          <h1
            className="font-display font-light leading-[0.9] text-[#f0ede8] mb-2"
            style={{ fontSize: 'clamp(28px, 5vw, 72px)' }}
          >
            {title}
          </h1>
          <p className="font-mono text-[9px] tracking-[0.22em] text-[#c8955a]/55 mb-4 uppercase">
            {subtitle}
          </p>
          <p className="text-[#f0ede8]/38 text-[13px] leading-[1.75] max-w-lg mb-5">
            {description}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {mod.metadata.theory.map((tag) => (
              <span key={tag} className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/22 uppercase">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-[#f0ede8]/7 mb-10" />

        {/* ── Module viewer ── */}
        <ModuleViewer mod={mod} />

      </div>
    </AppLayout>
  )
}

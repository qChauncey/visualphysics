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
    <AppLayout mainClassName="flex-1 relative flex items-center justify-center">
      <p className="font-mono text-xs text-[#f0ede8]/30">{t.notFound}{id}</p>
    </AppLayout>
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!mod) return (
    <AppLayout mainClassName="flex-1 relative flex items-center justify-center">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#f0ede8]/20 uppercase animate-pulse">
        {t.loading}
      </span>
    </AppLayout>
  )

  // Prefer English metadata when lang=en and fields exist
  const title    = lang === 'en' && mod.metadata.titleEn ? mod.metadata.titleEn : mod.metadata.title
  const subtitle = lang === 'en' ? mod.metadata.title : (mod.metadata.titleEn ?? '')

  // ── Full-screen module ────────────────────────────────────────────────────
  return (
    <AppLayout mainClassName="flex-1 relative overflow-hidden">

      {/* Canvas — fills entire main area */}
      <ModuleViewer mod={mod} />

      {/* Module title overlay — top-left, below hamburger button */}
      <div className="absolute top-12 left-4 z-20 pointer-events-none select-none">
        <h1
          className="font-display font-light text-[#f0ede8]/80 leading-[1.1]"
          style={{ fontSize: 'clamp(13px, 1.8vw, 22px)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="font-mono text-[7px] tracking-[0.22em] text-[#c8955a]/40 mt-0.5 uppercase">
            {subtitle}
          </p>
        )}
      </div>

    </AppLayout>
  )
}

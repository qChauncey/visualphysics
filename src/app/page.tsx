'use client'
import dynamic from 'next/dynamic'
import AppLayout from '@/ui/components/AppLayout'
import { useLang, UI } from '@/core/i18n'

// Three.js only loads client-side
const ParticleSphere = dynamic(
  () => import('@/ui/components/ParticleSphere'),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#080808]" /> }
)

export default function HomePage() {
  const { lang } = useLang()
  const t = UI[lang]

  return (
    <AppLayout mainClassName="flex-1 relative overflow-hidden">

      {/* Sphere fills entire area */}
      <div className="absolute inset-0">
        <ParticleSphere />
      </div>

      {/* Subtle radial gradient — darkens edges for readability */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 60% 50%, transparent 40%, rgba(8,8,8,0.55) 100%)',
        }}
      />

      {/* ── Hero text — bottom left ── */}
      <div className="absolute bottom-10 left-6 sm:bottom-14 sm:left-12 pointer-events-none">
        <h1
          className="font-display font-light leading-[0.88] text-[#f0ede8] reveal"
          style={{
            fontSize: 'clamp(36px, 5.5vw, 96px)',
            '--delay': '0ms',
          } as React.CSSProperties}
        >
          {t.heroLine1}<br />{t.heroLine2}<br />{t.heroLine3}
        </h1>
        <p
          className="text-[#f0ede8]/38 text-[13px] leading-relaxed max-w-xs mt-5 reveal"
          style={{ '--delay': '80ms' } as React.CSSProperties}
        >
          {t.heroSub1}<br />
          {t.heroSub2}
        </p>
      </div>

      {/* ── Select prompt — bottom right ── */}
      <div className="absolute bottom-8 right-8 pointer-events-none hidden sm:block">
        <span className="font-mono text-[9px] tracking-[0.22em] text-[#f0ede8]/18 uppercase">
          {t.selectPrompt}
        </span>
      </div>

    </AppLayout>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang, UI } from '@/core/i18n'

// ── Module catalogue (single source of truth) ─────────────────────────────

const CATEGORIES = [
  {
    key: 'catClassical' as const,
    modules: [
      { id: 'double-pendulum',     num: '01', zh: '双摆混沌',        en: 'Double Pendulum',    ready: true  },
    ],
  },
  {
    key: 'catQuantum' as const,
    modules: [
      { id: 'hydrogen-orbital',    num: '02', zh: '氢原子轨道',      en: 'Hydrogen Orbitals',  ready: true  },
      { id: 'double-slit',         num: '04', zh: '双缝实验',        en: 'Double Slit',        ready: true  },
    ],
  },
  {
    key: 'catAstro' as const,
    modules: [
      { id: 'space-scale',         num: '03', zh: '宇宙尺度',        en: 'Cosmic Scale',       ready: true  },
    ],
  },
  {
    key: 'catGR' as const,
    modules: [
      { id: 'spacetime-curvature', num: '05', zh: '时空曲率',        en: 'Spacetime Curvature',ready: false },
    ],
  },
  {
    key: 'catString' as const,
    modules: [
      { id: 'calabi-yau',          num: '06', zh: 'Calabi-Yau 流形', en: 'Calabi-Yau Manifold',ready: false },
    ],
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  /** Called when user navigates or taps close (mobile drawer only) */
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const pathname = usePathname()
  const activeId = pathname.startsWith('/module/')
    ? pathname.split('/')[2]
    : null

  const { lang, setLang } = useLang()
  const t = UI[lang]

  return (
    <aside className="w-60 flex-shrink-0 h-screen flex flex-col border-r border-[#f0ede8]/7 bg-[#040404] overflow-y-auto">

      {/* ── Logo + mobile close button ── */}
      <div className="px-6 pt-8 pb-6 border-b border-[#f0ede8]/7 flex items-start justify-between">
        <Link href="/" onClick={onClose} className="block group">
          <h1 className="font-display font-light text-[20px] leading-tight text-[#f0ede8] group-hover:text-[#f0ede8]/80 transition-colors duration-300">
            {lang === 'zh' ? <>物理<br />可视化</> : <>Physics<br />Viz</>}
          </h1>
          <p className="font-mono text-[8px] tracking-[0.26em] text-[#f0ede8]/22 mt-1.5 uppercase">
            {lang === 'zh' ? 'Physics Viz' : '物理可视化'}
          </p>
        </Link>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            aria-label="Close navigation"
            onClick={onClose}
            className="md:hidden mt-1 text-[#f0ede8]/30 hover:text-[#f0ede8]/60 transition-colors duration-200 text-lg leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 py-5 space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.key}>
            {/* Category label */}
            <p className="font-mono text-[7.5px] tracking-[0.28em] text-[#f0ede8]/20 uppercase px-2 mb-2">
              {t[cat.key]}
            </p>

            {/* Module links */}
            <div className="space-y-px">
              {cat.modules.map((m) => {
                const active = m.id === activeId
                const title  = lang === 'zh' ? m.zh : m.en

                if (!m.ready) return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 opacity-28 select-none"
                  >
                    <span className="font-mono text-[9px] text-[#f0ede8]/30 w-5">{m.num}</span>
                    <span className="text-[12px] text-[#f0ede8]/35 flex-1">{title}</span>
                    <span className="font-mono text-[7px] tracking-[0.2em] text-[#f0ede8]/22">{t.soon}</span>
                  </div>
                )

                return (
                  <Link
                    key={m.id}
                    href={`/module/${m.id}`}
                    onClick={onClose}
                    className={`flex items-center gap-2.5 px-2 py-1.5 transition-colors duration-200 group ${
                      active ? 'bg-[#f0ede8]/5' : 'hover:bg-[#f0ede8]/[0.035]'
                    }`}
                  >
                    <span className={`font-mono text-[9px] w-5 transition-colors duration-200 ${
                      active ? 'text-[#c8955a]' : 'text-[#f0ede8]/28 group-hover:text-[#f0ede8]/50'
                    }`}>
                      {m.num}
                    </span>
                    <span className={`text-[12px] flex-1 transition-colors duration-200 ${
                      active ? 'text-[#f0ede8]' : 'text-[#f0ede8]/52 group-hover:text-[#f0ede8]/80'
                    }`}>
                      {title}
                    </span>
                    {active && (
                      <span className="w-1 h-1 rounded-full bg-[#c8955a] flex-shrink-0" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ── */}
      <div className="px-4 py-5 border-t border-[#f0ede8]/7 space-y-px">
        {/* Theory tree — coming soon */}
        <div className="flex items-center gap-2.5 px-2 py-1.5 opacity-30 select-none">
          <span className="font-mono text-[9px] text-[#f0ede8]/30 w-5">↗</span>
          <span className="text-[12px] text-[#f0ede8]/35 flex-1">{t.theoryTree}</span>
          <span className="font-mono text-[7px] tracking-[0.2em] text-[#f0ede8]/22">{t.soon}</span>
        </div>

        {/* Lang toggle + year */}
        <div className="flex items-center justify-between px-2 pt-2">
          <p className="font-mono text-[8px] text-[#f0ede8]/14">
            {new Date().getFullYear()}
          </p>
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="font-mono text-[8px] tracking-[0.18em] text-[#f0ede8]/30 hover:text-[#c8955a] transition-colors duration-200 uppercase"
          >
            {t.langToggle}
          </button>
        </div>
      </div>

    </aside>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// ── Module catalogue (single source of truth) ─────────────────────────────

const CATEGORIES = [
  {
    labelEn: 'CLASSICAL MECHANICS',
    modules: [
      { id: 'double-pendulum',     num: '01', title: '双摆混沌',       ready: true  },
    ],
  },
  {
    labelEn: 'QUANTUM MECHANICS',
    modules: [
      { id: 'hydrogen-orbital',    num: '02', title: '氢原子轨道',    ready: true  },
      { id: 'double-slit',         num: '04', title: '双缝实验',      ready: true  },
    ],
  },
  {
    labelEn: 'ASTROPHYSICS',
    modules: [
      { id: 'space-scale',         num: '03', title: '宇宙尺度',       ready: true  },
    ],
  },
  {
    labelEn: 'GENERAL RELATIVITY',
    modules: [
      { id: 'spacetime-curvature', num: '05', title: '时空曲率',       ready: false },
    ],
  },
  {
    labelEn: 'STRING THEORY',
    modules: [
      { id: 'calabi-yau',          num: '06', title: 'Calabi-Yau 流形', ready: false },
    ],
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname()
  const activeId = pathname.startsWith('/module/')
    ? pathname.split('/')[2]
    : null

  return (
    <aside className="w-60 flex-shrink-0 h-screen flex flex-col border-r border-[#f0ede8]/7 bg-[#040404] overflow-y-auto">

      {/* ── Logo ── */}
      <div className="px-6 pt-8 pb-6 border-b border-[#f0ede8]/7">
        <Link href="/" className="block group">
          <h1 className="font-display font-light text-[20px] leading-tight text-[#f0ede8] group-hover:text-[#f0ede8]/80 transition-colors duration-300">
            物理<br />可视化
          </h1>
          <p className="font-mono text-[8px] tracking-[0.26em] text-[#f0ede8]/22 mt-1.5 uppercase">
            Physics Viz
          </p>
        </Link>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 py-5 space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.labelEn}>
            {/* Category label */}
            <p className="font-mono text-[7.5px] tracking-[0.28em] text-[#f0ede8]/20 uppercase px-2 mb-2">
              {cat.labelEn}
            </p>

            {/* Module links */}
            <div className="space-y-px">
              {cat.modules.map((m) => {
                const active = m.id === activeId

                if (!m.ready) return (
                  <div
                    key={m.id}
                    className="flex items-center gap-2.5 px-2 py-1.5 opacity-28 select-none"
                  >
                    <span className="font-mono text-[9px] text-[#f0ede8]/30 w-5">{m.num}</span>
                    <span className="text-[12px] text-[#f0ede8]/35 flex-1">{m.title}</span>
                    <span className="font-mono text-[7px] tracking-[0.2em] text-[#f0ede8]/22">SOON</span>
                  </div>
                )

                return (
                  <Link
                    key={m.id}
                    href={`/module/${m.id}`}
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
                      {m.title}
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
          <span className="text-[12px] text-[#f0ede8]/35 flex-1">理论发展树</span>
          <span className="font-mono text-[7px] tracking-[0.2em] text-[#f0ede8]/22">SOON</span>
        </div>

        <p className="font-mono text-[8px] text-[#f0ede8]/14 px-2 pt-2">
          {new Date().getFullYear()}
        </p>
      </div>

    </aside>
  )
}

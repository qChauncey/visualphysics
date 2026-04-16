'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang, UI } from '@/core/i18n'

// ── Module catalogue (single source of truth) ─────────────────────────────

const CATEGORIES = [
  {
    key: 'catClassical' as const,
    modules: [
      { id: 'double-pendulum',       num: '01', zh: '双摆混沌',        en: 'Double Pendulum',      ready: true },
      { id: 'three-body',            num: '11', zh: '三体问题',        en: 'Three-Body Problem',   ready: true },
      { id: 'brownian-motion',       num: '19', zh: '布朗运动',        en: 'Brownian Motion',      ready: true },
      { id: 'lagrange-points',       num: '21', zh: '拉格朗日点',      en: 'Lagrange Points',      ready: true },
    ],
  },
  {
    key: 'catQuantum' as const,
    modules: [
      { id: 'hydrogen-orbital',         num: '02', zh: '氢原子轨道',      en: 'Hydrogen Orbitals',      ready: true },
      { id: 'double-slit',            num: '04', zh: '双缝实验',        en: 'Double Slit',            ready: true },
      { id: 'ising-model',            num: '10', zh: '伊辛模型',        en: 'Ising Model',            ready: true },
      { id: 'blackbody-radiation',    num: '14', zh: '黑体辐射',        en: 'Blackbody Radiation',    ready: true },
      { id: 'quantum-tunneling',      num: '13', zh: '量子隧穿',        en: 'Quantum Tunneling',      ready: true },
      { id: 'quantum-entanglement',   num: '18', zh: '量子纠缠',        en: 'Quantum Entanglement',   ready: true },
      { id: 'wavefunction-evolution', num: '20', zh: '波函数演化',      en: 'Wavefunction Evolution', ready: true },
    ],
  },
  {
    key: 'catAstro' as const,
    modules: [
      { id: 'space-scale',           num: '03', zh: '宇宙尺度',        en: 'Cosmic Scale',         ready: true },
      { id: 'gravitational-lensing', num: '17', zh: '引力透镜',        en: 'Gravitational Lensing',ready: true },
    ],
  },
  {
    key: 'catGR' as const,
    modules: [
      { id: 'spacetime-curvature',   num: '05', zh: '时空曲率',        en: 'Spacetime Curvature',  ready: true },
      { id: 'gravitational-waves',   num: '07', zh: '引力波',          en: 'Gravitational Waves',  ready: true },
      { id: 'schwarzschild',         num: '12', zh: '史瓦西黑洞',      en: 'Schwarzschild BH',     ready: true },
      { id: 'minkowski-diagram',     num: '16', zh: '闵可夫斯基时空',  en: 'Minkowski Diagram',    ready: true },
    ],
  },
  {
    key: 'catParticle' as const,
    modules: [
      { id: 'higgs-field',           num: '09', zh: '希格斯场',        en: 'Higgs Field',          ready: true },
      { id: 'feynman-diagrams',      num: '08', zh: '费曼图',          en: 'Feynman Diagrams',     ready: true },
    ],
  },
  {
    key: 'catString' as const,
    modules: [
      { id: 'calabi-yau',            num: '06', zh: 'Calabi-Yau 流形', en: 'Calabi-Yau Manifold',  ready: true },
      { id: 'string-worldsheet',     num: '15', zh: '弦世界面',        en: 'String Worldsheet',    ready: true },
    ],
  },
] as const

// ── Component ─────────────────────────────────────────────────────────────

interface Props {
  /** Called when a navigation link is tapped — used by mobile drawer to close */
  onClose?: () => void
  /** Called when the ‹ collapse button is clicked — desktop only */
  onCollapse?: () => void
}

export default function Sidebar({ onClose, onCollapse }: Props) {
  const pathname = usePathname()
  const activeId = pathname.startsWith('/module/')
    ? pathname.split('/')[2]
    : null

  const { lang, setLang } = useLang()
  const t = UI[lang]

  return (
    <aside className="w-60 flex-shrink-0 h-screen flex flex-col border-r border-[#f0ede8]/7 bg-[#040404] overflow-y-auto">

      {/* ── Logo + collapse / close buttons ── */}
      <div className="px-6 pt-8 pb-6 border-b border-[#f0ede8]/7 flex items-start justify-between">
        <Link href="/" onClick={onClose} className="block group">
          <h1 className="font-display font-light text-[20px] leading-tight text-[#f0ede8] group-hover:text-[#f0ede8]/80 transition-colors duration-300">
            {lang === 'zh' ? <>物理<br />可视化</> : <>Physics<br />Viz</>}
          </h1>
          <p className="font-mono text-[8px] tracking-[0.26em] text-[#f0ede8]/22 mt-1.5 uppercase">
            {lang === 'zh' ? 'Physics Viz' : '物理可视化'}
          </p>
        </Link>

        <div className="flex items-center gap-1 mt-1">
          {/* Collapse arrow — desktop only */}
          {onCollapse && (
            <button
              aria-label="Collapse sidebar"
              onClick={onCollapse}
              className="hidden md:flex items-center justify-center w-6 h-6 text-[#f0ede8]/28 hover:text-[#f0ede8]/65 transition-colors duration-200 text-sm"
            >
              ‹
            </button>
          )}
          {/* Close button — mobile only */}
          {onClose && (
            <button
              aria-label="Close navigation"
              onClick={onClose}
              className="md:hidden flex items-center justify-center w-6 h-6 text-[#f0ede8]/30 hover:text-[#f0ede8]/60 transition-colors duration-200 text-lg leading-none"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 px-4 py-5 space-y-5">
        {CATEGORIES.map((cat) => (
          <div key={cat.key}>
            {/* Category label — readable size */}
            <p className="font-mono text-[10px] tracking-[0.22em] text-[#f0ede8]/45 uppercase px-2 mb-2">
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
        {/* Theory tree */}
        <Link
          href="/theory"
          onClick={onClose}
          className={`flex items-center gap-2.5 px-2 py-1.5 transition-colors duration-200 group ${
            pathname === '/theory' ? 'bg-[#f0ede8]/5' : 'hover:bg-[#f0ede8]/[0.035]'
          }`}
        >
          <span className={`font-mono text-[9px] w-5 transition-colors duration-200 ${
            pathname === '/theory' ? 'text-[#c8955a]' : 'text-[#f0ede8]/28 group-hover:text-[#f0ede8]/50'
          }`}>↗</span>
          <span className={`text-[12px] flex-1 transition-colors duration-200 ${
            pathname === '/theory' ? 'text-[#f0ede8]' : 'text-[#f0ede8]/52 group-hover:text-[#f0ede8]/80'
          }`}>{t.theoryTree}</span>
          {pathname === '/theory' && (
            <span className="w-1 h-1 rounded-full bg-[#c8955a] flex-shrink-0" />
          )}
        </Link>

        {/* Lang toggle + year */}
        <div className="flex items-center justify-between px-2 pt-3">
          <p className="font-mono text-[8px] text-[#f0ede8]/14">
            {new Date().getFullYear()}
          </p>
          <button
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            className="font-mono text-[9px] tracking-[0.15em] px-2.5 py-1 border border-[#f0ede8]/18 text-[#f0ede8]/55 hover:text-[#c8955a] hover:border-[#c8955a]/40 transition-colors duration-200 uppercase"
          >
            {t.langToggle}
          </button>
        </div>
      </div>

    </aside>
  )
}

import Link from 'next/link'

// ── Module catalogue ──────────────────────────────────────────────────────────

const MODULES = [
  {
    id:      'double-pendulum',
    num:     '01',
    title:   '双摆混沌',
    titleEn: 'Double Pendulum',
    desc:    '初始条件的微小差异导致轨迹的完全发散——混沌的最简模型。',
    theory:  ['Classical Mechanics'],
    ready:   true,
  },
  {
    id:      'hydrogen-orbital',
    num:     '02',
    title:   '氢原子轨道',
    titleEn: 'Hydrogen Orbitals',
    desc:    '电子并非在固定轨道运行，而是弥散为概率密度云——量子力学的核心图像。',
    theory:  ['Quantum Mechanics'],
    ready:   true,
  },
  {
    id:      'space-scale',
    num:     '03',
    title:   '宇宙尺度',
    titleEn: 'Scale of the Universe',
    desc:    '太阳系天体的真实比例对比，以及时间压缩后的轨道动力学。',
    theory:  ['Astrophysics', 'General Relativity'],
    ready:   true,
  },
  {
    id:      'double-slit',
    num:     '04',
    title:   '双缝实验',
    titleEn: 'Double Slit',
    desc:    '观测行为本身改变结果——量子测量与波函数坍缩的直观展示。',
    theory:  ['Quantum Mechanics'],
    ready:   true,
  },
  {
    id:      'spacetime-curvature',
    num:     '05',
    title:   '时空曲率',
    titleEn: 'Spacetime Curvature',
    desc:    '质量弯曲时空，而非产生"引力"。广义相对论的几何语言。',
    theory:  ['General Relativity'],
    ready:   false,
  },
  {
    id:      'calabi-yau',
    num:     '06',
    title:   'Calabi-Yau 流形',
    titleEn: 'Calabi-Yau Manifold',
    desc:    '弦论要求额外六维紧致化于此——我们看不见的几何维度。',
    theory:  ['String Theory'],
    ready:   false,
  },
] as const

// ── Card component ────────────────────────────────────────────────────────────

type Mod = (typeof MODULES)[number]

function ModuleCard({ m, index }: { m: Mod; index: number }) {
  const inner = (
    <div
      className={`
        bg-[#080808] p-7 flex flex-col min-h-[240px]
        transition-colors duration-[400ms] ease-expo
        ${m.ready ? 'hover:bg-[#0d0d0b]' : 'opacity-50'}
      `}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-8">
        <span className="font-mono text-[10px] text-[#f0ede8]/22 tracking-widest">
          {m.num}
        </span>
        {!m.ready && (
          <span className="font-mono text-[9px] text-[#f0ede8]/22 tracking-[0.2em] uppercase">
            Soon
          </span>
        )}
      </div>

      {/* Title */}
      <h2 className="font-display font-light text-[26px] leading-[1.1] text-[#f0ede8] mb-1">
        {m.title}
      </h2>
      <p className="font-mono text-[9px] tracking-[0.18em] text-[#c8955a]/55 mb-5">
        {m.titleEn.toUpperCase()}
      </p>

      {/* Divider */}
      <div className="h-px bg-[#f0ede8]/7 mb-5" />

      {/* Description */}
      <p className="text-[#f0ede8]/42 text-[13px] leading-[1.7] flex-1">
        {m.desc}
      </p>

      {/* Theory tags */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-5">
        {m.theory.map((tag) => (
          <span
            key={tag}
            className="font-mono text-[9px] tracking-[0.15em] text-[#f0ede8]/22 uppercase"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )

  const delay = `${index * 90}ms`

  if (!m.ready) {
    return (
      <div
        className="reveal border-r border-b border-[#f0ede8]/7"
        style={{ '--delay': delay } as React.CSSProperties}
      >
        {inner}
      </div>
    )
  }

  return (
    <Link
      href={`/module/${m.id}`}
      className="reveal border-r border-b border-[#f0ede8]/7 block"
      style={{ '--delay': delay } as React.CSSProperties}
    >
      {inner}
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080808] text-[#f0ede8]">

      {/* ── Top bar ── */}
      <header className="max-w-6xl mx-auto px-8 pt-10 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[0.28em] text-[#f0ede8]/25 uppercase">
          Physics Visualization
        </span>
        <span className="font-mono text-[10px] text-[#f0ede8]/18">
          {new Date().getFullYear()}
        </span>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-6xl mx-auto px-8 pt-20 pb-24">
        <h1
          className="font-display font-light leading-[0.88] text-[#f0ede8] mb-10 reveal"
          style={{
            fontSize: 'clamp(72px, 10vw, 136px)',
            '--delay': '0ms',
          } as React.CSSProperties}
        >
          物理<br />可视化
        </h1>
        <p
          className="text-[#f0ede8]/38 text-sm leading-relaxed max-w-sm reveal"
          style={{ '--delay': '80ms' } as React.CSSProperties}
        >
          从经典混沌到量子引力——<br />
          交互式物理实验与理论可视化。
        </p>
      </section>

      {/* ── Module grid ── */}
      <section
        className="max-w-6xl mx-auto px-8 pb-32"
      >
        {/* outer top + left border */}
        <div className="border-t border-l border-[#f0ede8]/7">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {MODULES.map((m, i) => (
              <ModuleCard key={m.id} m={m} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="max-w-6xl mx-auto px-8 pb-10 border-t border-[#f0ede8]/7 pt-8 flex items-center justify-between">
        <span className="font-mono text-[9px] text-[#f0ede8]/18 tracking-widest uppercase">
          Visual Physics
        </span>
        <span className="font-mono text-[9px] text-[#f0ede8]/18">
          静态部署 · 浏览器内计算
        </span>
      </footer>

    </main>
  )
}

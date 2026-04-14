import Link from 'next/link'

const modules = [
  {
    id: 'double-pendulum',
    title: '双摆混沌',
    titleEn: 'Double Pendulum',
    desc: '经典混沌——初始条件的微小差异导致完全不同的轨迹',
    tags: ['经典力学'],
    color: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500/30',
    ready: true,
  },
  {
    id: 'hydrogen-orbital',
    title: '氢原子轨道',
    titleEn: 'Hydrogen Orbitals',
    desc: '量子力学概率云——1s / 2p / 3d 轨道可视化',
    tags: ['量子力学'],
    color: 'from-purple-500/20 to-pink-500/10',
    border: 'border-purple-500/30',
    ready: true,
  },
  {
    id: 'space-scale',
    title: '宇宙尺度',
    titleEn: 'Scale of the Universe',
    desc: '太阳系天体大小对比与轨道运动——感受行星尺度的巨大差异',
    tags: ['天体物理', '广义相对论'],
    color: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500/30',
    ready: true,
  },
]

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#080810] text-white">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-12">
        <p className="text-xs font-mono text-blue-400/70 mb-3 tracking-widest uppercase">
          Physics Visualization
        </p>
        <h1 className="text-4xl font-light tracking-tight text-white/90 mb-4">
          物理可视化
        </h1>
        <p className="text-neutral-400 max-w-xl leading-relaxed">
          从经典混沌到量子引力——交互式物理实验与理论可视化。
          每个模块独立运行，可实时调整参数观察系统演化。
        </p>
      </div>

      {/* Module grid */}
      <div className="max-w-5xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m) => (
            <Link
              key={m.id}
              href={m.ready ? `/module/${m.id}` : '#'}
              className={`
                group relative rounded-2xl border p-6 transition-all duration-200
                bg-gradient-to-br ${m.color} ${m.border}
                ${m.ready
                  ? 'hover:scale-[1.02] hover:border-white/20 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed'}
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-white/90">{m.title}</h2>
                  <p className="text-xs text-white/40 font-mono mt-0.5">{m.titleEn}</p>
                </div>
                {!m.ready && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                    即将上线
                  </span>
                )}
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed mb-4">{m.desc}</p>
              <div className="flex flex-wrap gap-1.5">
                {m.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}

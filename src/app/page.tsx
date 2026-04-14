import dynamic from 'next/dynamic'
import Sidebar from '@/ui/components/Sidebar'

// Three.js only loads client-side
const ParticleSphere = dynamic(
  () => import('@/ui/components/ParticleSphere'),
  { ssr: false, loading: () => <div className="w-full h-full bg-[#080808]" /> }
)

export default function HomePage() {
  return (
    <div className="flex h-screen bg-[#080808] text-[#f0ede8] overflow-hidden">

      <Sidebar />

      {/* ── Main: particle sphere hero ── */}
      <main className="flex-1 relative overflow-hidden">

        {/* Sphere fills entire area */}
        <div className="absolute inset-0">
          <ParticleSphere />
        </div>

        {/* Subtle radial gradient — darkens the edges so text is readable */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 80% at 60% 50%, transparent 40%, rgba(8,8,8,0.55) 100%)',
          }}
        />

        {/* ── Hero text — bottom left ── */}
        <div className="absolute bottom-14 left-12 pointer-events-none">
          <h1
            className="font-display font-light leading-[0.88] text-[#f0ede8] reveal"
            style={{
              fontSize: 'clamp(48px, 5.5vw, 96px)',
              '--delay': '0ms',
            } as React.CSSProperties}
          >
            From chaos<br />to quantum<br />gravity.
          </h1>
          <p
            className="text-[#f0ede8]/38 text-[13px] leading-relaxed max-w-xs mt-5 reveal"
            style={{ '--delay': '80ms' } as React.CSSProperties}
          >
            Interactive physics experiments.<br />
            Browser-native computation.
          </p>
        </div>

        {/* ── Select prompt — bottom right ── */}
        <div className="absolute bottom-8 right-8 pointer-events-none">
          <span className="font-mono text-[9px] tracking-[0.22em] text-[#f0ede8]/18 uppercase">
            select a module ←
          </span>
        </div>

      </main>
    </div>
  )
}

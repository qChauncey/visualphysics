'use client'

import { useEffect, useState } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  total:     number
  daily:     { date: string;   count: number }[]
  monthly:   { month: string;  count: number }[]
  modules:   { module: string; count: number }[]
  countries: { country: string; count: number }[]
  devices:   { device: string; count: number }[]
  langs:     { lang: string;   count: number }[]
}

// ── Colour palette (matches app design tokens) ────────────────────────────────
const COPPER  = '#c8955a'
const DIM     = 'rgba(240,237,232,0.35)'
const FAINT   = 'rgba(240,237,232,0.08)'
const TEXT    = '#f0ede8'
const BG      = '#04040c'
const SURFACE = '#0b0b14'

// ── Country flag emoji helper ─────────────────────────────────────────────────
function countryFlag(code: string): string {
  if (code === 'unknown' || code.length !== 2) return '🌐'
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  )
}

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

function LineChart({ data, xKey, yKey, label }: {
  data:  Record<string, string | number>[]
  xKey:  string
  yKey:  string
  label: string
}) {
  const W = 560, H = 140, PL = 36, PR = 12, PT = 12, PB = 28
  const iW = W - PL - PR, iH = H - PT - PB

  if (!data.length) return <EmptyChart label={label} w={W} h={H} />

  const vals   = data.map(d => Number(d[yKey]))
  const maxVal = Math.max(...vals, 1)
  const pts    = data.map((d, i) => {
    const x = PL + (i / Math.max(data.length - 1, 1)) * iW
    const y = PT + iH - (Number(d[yKey]) / maxVal) * iH
    return `${x},${y}`
  })
  const area = [
    `M${PL},${PT + iH}`,
    ...data.map((d, i) => {
      const x = PL + (i / Math.max(data.length - 1, 1)) * iW
      const y = PT + iH - (Number(d[yKey]) / maxVal) * iH
      return `L${x},${y}`
    }),
    `L${PL + iW},${PT + iH}Z`,
  ].join(' ')

  // X-axis labels: show ~5 evenly
  const step = Math.max(1, Math.floor(data.length / 5))
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <svg width={W} height={H} className="overflow-visible">
      {/* Area fill */}
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={COPPER} stopOpacity={0.25} />
          <stop offset="100%" stopColor={COPPER} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#areaGrad)" />
      {/* Line */}
      <polyline points={pts.join(' ')} fill="none" stroke={COPPER} strokeWidth={1.8} strokeLinejoin="round" />
      {/* Dots */}
      {pts.map((pt, i) => {
        const [x, y] = pt.split(',').map(Number)
        return <circle key={i} cx={x} cy={y} r={2.5} fill={COPPER} />
      })}
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map(frac => {
        const y = PT + iH - frac * iH
        return (
          <g key={frac}>
            <line x1={PL} y1={y} x2={PL + iW} y2={y} stroke={FAINT} strokeWidth={1} />
            <text x={PL - 4} y={y + 4} textAnchor="end" fontSize={8} fill={DIM}>
              {Math.round(maxVal * frac)}
            </text>
          </g>
        )
      })}
      {/* X labels */}
      {xLabels.map((d, i) => {
        const idx = data.indexOf(d)
        const x   = PL + (idx / Math.max(data.length - 1, 1)) * iW
        const raw = String(d[xKey])
        const lbl = raw.length > 7 ? raw.slice(5) : raw
        return (
          <text key={i} x={x} y={H - 4} textAnchor="middle" fontSize={8} fill={DIM}>
            {lbl}
          </text>
        )
      })}
    </svg>
  )
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function BarChart({ data, xKey, yKey }: {
  data: Record<string, string | number>[]
  xKey: string
  yKey: string
}) {
  const W = 560, H = 140, PL = 36, PR = 12, PT = 12, PB = 28
  const iW = W - PL - PR, iH = H - PT - PB

  if (!data.length) return <EmptyChart label="" w={W} h={H} />

  const vals    = data.map(d => Number(d[yKey]))
  const maxVal  = Math.max(...vals, 1)
  const barW    = Math.max(4, iW / data.length - 3)

  return (
    <svg width={W} height={H} className="overflow-visible">
      {/* Y gridlines */}
      {[0.25, 0.5, 0.75, 1].map(frac => {
        const y = PT + iH - frac * iH
        return (
          <g key={frac}>
            <line x1={PL} y1={y} x2={PL + iW} y2={y} stroke={FAINT} strokeWidth={1} />
            <text x={PL - 4} y={y + 4} textAnchor="end" fontSize={8} fill={DIM}>
              {Math.round(maxVal * frac)}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const barH  = (Number(d[yKey]) / maxVal) * iH
        const x     = PL + (i / data.length) * iW + 1.5
        const y     = PT + iH - barH
        const raw   = String(d[xKey])
        const lbl   = raw.length > 7 ? raw.slice(5) : raw
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH}
              fill={COPPER} fillOpacity={0.70} rx={1} />
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize={7.5} fill={DIM}>
              {lbl}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Horizontal bar chart (for modules / countries) ────────────────────────────

function HBarChart({ data, nameKey, valueKey, maxRows = 10 }: {
  data:     Record<string, string | number>[]
  nameKey:  string
  valueKey: string
  maxRows?: number
}) {
  const rows    = data.slice(0, maxRows)
  const maxVal  = Math.max(...rows.map(d => Number(d[valueKey])), 1)
  const ROW_H   = 22

  return (
    <div className="space-y-1">
      {rows.map((d, i) => {
        const pct  = (Number(d[valueKey]) / maxVal) * 100
        const name = String(d[nameKey])
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="font-mono text-[9px] w-28 truncate shrink-0" style={{ color: TEXT, opacity: 0.6 }}>
              {name}
            </span>
            <div className="flex-1 h-[6px] rounded-sm overflow-hidden" style={{ background: FAINT }}>
              <div
                className="h-full rounded-sm transition-all duration-500"
                style={{ width: `${pct}%`, background: COPPER, opacity: 0.75 }}
              />
            </div>
            <span className="font-mono text-[9px] w-8 text-right shrink-0" style={{ color: DIM }}>
              {d[valueKey]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Donut chart ───────────────────────────────────────────────────────────────

const DONUT_COLORS = [COPPER, '#7eb8e8', '#78d9a8', '#b08af0', '#f07878', '#e8c55a']

function DonutChart({ data, nameKey, valueKey }: {
  data:     Record<string, string | number>[]
  nameKey:  string
  valueKey: string
}) {
  const total  = data.reduce((s, d) => s + Number(d[valueKey]), 0) || 1
  const R = 44, r = 26, cx = 56, cy = 56
  let angle = -Math.PI / 2

  const slices = data.map((d, i) => {
    const frac  = Number(d[valueKey]) / total
    const sweep = frac * 2 * Math.PI
    const x1    = cx + R * Math.cos(angle)
    const y1    = cy + R * Math.sin(angle)
    angle += sweep
    const x2    = cx + R * Math.cos(angle)
    const y2    = cy + R * Math.sin(angle)
    const xi1   = cx + r * Math.cos(angle - sweep)
    const yi1   = cy + r * Math.sin(angle - sweep)
    const xi2   = cx + r * Math.cos(angle)
    const yi2   = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    return {
      d: `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2}
          L${xi2},${yi2} A${r},${r} 0 ${large},0 ${xi1},${yi1}Z`,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      label: String(d[nameKey]),
      pct:   Math.round(frac * 100),
    }
  })

  return (
    <div className="flex items-center gap-4">
      <svg width={112} height={112}>
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} fillOpacity={0.80} />
        ))}
      </svg>
      <div className="space-y-1.5">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="font-mono text-[9px]" style={{ color: TEXT, opacity: 0.65 }}>
              {s.label}
            </span>
            <span className="font-mono text-[9px]" style={{ color: DIM }}>
              {s.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyChart({ label, w, h }: { label: string; w: number; h: number }) {
  return (
    <svg width={w} height={h}>
      <text x={w / 2} y={h / 2} textAnchor="middle" fontSize={10} fill={DIM}>
        {label ? `No data yet for "${label}"` : 'No data yet'}
      </text>
    </svg>
  )
}

// ── Card wrapper ──────────────────────────────────────────────────────────────

function Card({ title, children, wide }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div
      className={`p-5 border border-[#f0ede8]/8 ${wide ? 'col-span-2' : ''}`}
      style={{ background: SURFACE }}
    >
      <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-4" style={{ color: COPPER, opacity: 0.7 }}>
        {title}
      </p>
      {children}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-5 border border-[#f0ede8]/8" style={{ background: SURFACE }}>
      <p className="font-mono text-[9px] tracking-[0.2em] uppercase mb-2" style={{ color: DIM }}>
        {label}
      </p>
      <p className="font-display font-light text-3xl" style={{ color: COPPER }}>
        {value}
      </p>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminStats() {
  const [data, setData]     = useState<AnalyticsData | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(String(e)); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <p className="font-mono text-[10px] tracking-widest" style={{ color: DIM }}>Loading analytics…</p>
    </div>
  )

  if (error || !data) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <p className="font-mono text-[10px]" style={{ color: '#f07878' }}>
        {error ?? 'Failed to load'}
      </p>
    </div>
  )

  // Compute today's and yesterday's views for summary
  const todayStr     = new Date().toISOString().slice(0, 10)
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const todayViews     = data.daily.find(d => d.date === todayStr)?.count     ?? 0
  const yesterdayViews = data.daily.find(d => d.date === yesterdayStr)?.count ?? 0
  const last30         = data.daily.reduce((s, d) => s + d.count, 0)

  return (
    <div className="min-h-screen px-6 py-10 md:px-12" style={{ background: BG, color: TEXT }}>

      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-light text-3xl mb-1" style={{ color: TEXT }}>
          Analytics
        </h1>
        <p className="font-mono text-[9px] tracking-[0.2em] uppercase" style={{ color: DIM }}>
          Physics Viz · Visitor Dashboard
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total pageviews" value={data.total.toLocaleString()} />
        <StatCard label="Last 30 days"    value={last30.toLocaleString()} />
        <StatCard label="Today"           value={todayViews} />
        <StatCard label="Yesterday"       value={yesterdayViews} />
      </div>

      {/* Daily chart */}
      <div className="grid grid-cols-1 gap-3 mb-3">
        <Card title="Daily pageviews — last 30 days" wide>
          <div className="overflow-x-auto">
            <LineChart
              data={data.daily as unknown as Record<string, string | number>[]}
              xKey="date"
              yKey="count"
              label="Daily pageviews"
            />
          </div>
        </Card>
      </div>

      {/* Monthly chart */}
      <div className="grid grid-cols-1 gap-3 mb-3">
        <Card title="Monthly pageviews — last 12 months" wide>
          <div className="overflow-x-auto">
            <BarChart
              data={data.monthly as unknown as Record<string, string | number>[]}
              xKey="month"
              yKey="count"
            />
          </div>
        </Card>
      </div>

      {/* Modules + Countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <Card title="Top modules">
          <HBarChart
            data={data.modules as unknown as Record<string, string | number>[]}
            nameKey="module"
            valueKey="count"
            maxRows={12}
          />
        </Card>
        <Card title="Top countries">
          <div className="space-y-1">
            {data.countries.slice(0, 15).map((c, i) => {
              const maxCount = Math.max(...data.countries.map(x => x.count), 1)
              const pct = (c.count / maxCount) * 100
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm w-6 shrink-0">{countryFlag(c.country)}</span>
                  <span className="font-mono text-[9px] w-8 shrink-0 uppercase" style={{ color: TEXT, opacity: 0.6 }}>
                    {c.country}
                  </span>
                  <div className="flex-1 h-[6px] rounded-sm overflow-hidden" style={{ background: FAINT }}>
                    <div
                      className="h-full rounded-sm transition-all duration-500"
                      style={{ width: `${pct}%`, background: COPPER, opacity: 0.75 }}
                    />
                  </div>
                  <span className="font-mono text-[9px] w-8 text-right shrink-0" style={{ color: DIM }}>
                    {c.count}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Device + Language */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <Card title="Device breakdown">
          <DonutChart
            data={data.devices as unknown as Record<string, string | number>[]}
            nameKey="device"
            valueKey="count"
          />
        </Card>
        <Card title="Language breakdown">
          <DonutChart
            data={data.langs as unknown as Record<string, string | number>[]}
            nameKey="lang"
            valueKey="count"
          />
        </Card>
      </div>

    </div>
  )
}

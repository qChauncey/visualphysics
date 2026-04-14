'use client'

import AppLayout from '@/ui/components/AppLayout'
import TheoryTree from '@/ui/components/TheoryTree'
import { useLang, UI } from '@/core/i18n'

export default function TheoryPage() {
  const { lang } = useLang()
  const t = UI[lang]

  return (
    <AppLayout mainClassName="flex-1 flex flex-col overflow-hidden">

      {/* ── Header bar ── */}
      <div className="flex-shrink-0 px-8 pt-14 pb-5 border-b border-[#f0ede8]/7">
        <h1
          className="font-display font-light text-[#f0ede8] leading-[0.9] mb-1"
          style={{ fontSize: 'clamp(24px, 3.5vw, 52px)' }}
        >
          {lang === 'zh' ? '理论发展树' : 'Theory Tree'}
        </h1>
        <p className="font-mono text-[9px] tracking-[0.22em] text-[#c8955a]/55 uppercase">
          {lang === 'zh' ? 'Theory Development Timeline' : '理论发展时间线'}
        </p>
        <p className="text-[#f0ede8]/30 text-[11px] mt-2">
          {lang === 'zh'
            ? '拖拽平移 · 滚轮缩放 · 点击节点查看详情'
            : 'drag to pan · scroll to zoom · click node for details'}
        </p>
      </div>

      {/* ── Tree canvas ── */}
      <div className="flex-1 overflow-hidden relative">
        <TheoryTree />
      </div>

    </AppLayout>
  )
}

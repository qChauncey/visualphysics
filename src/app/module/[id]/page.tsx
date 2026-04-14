'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { loadModule } from '@/core/registry'
import type { PhysicsModule } from '@/types/physics'
import ModuleViewer from '@/ui/components/ModuleViewer'

export default function ModulePage() {
  const { id } = useParams<{ id: string }>()
  const [mod, setMod] = useState<PhysicsModule | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    loadModule(id)
      .then((m) => {
        if (!m) setError(true)
        else setMod(m)
      })
      .catch(() => setError(true))
  }, [id])

  if (error) return (
    <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-neutral-500 mb-4">模块未找到：{id}</p>
        <Link href="/" className="text-blue-400 text-sm hover:underline">← 返回首页</Link>
      </div>
    </div>
  )

  if (!mod) return (
    <div className="min-h-screen bg-[#080810] text-white flex items-center justify-center">
      <p className="text-neutral-600 text-sm animate-pulse">加载模块中…</p>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#080810] text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Back + header */}
        <div className="mb-8">
          <Link href="/" className="text-xs text-neutral-500 hover:text-neutral-300 transition mb-4 inline-block">
            ← 返回
          </Link>
          <h1 className="text-2xl font-light text-white/90">{mod.metadata.title}</h1>
          <p className="text-sm text-neutral-500 mt-1">{mod.metadata.description}</p>
          <div className="flex gap-2 mt-3">
            {mod.metadata.theory.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 text-white/40 font-mono">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Module viewer */}
        <ModuleViewer mod={mod} />
      </div>
    </main>
  )
}

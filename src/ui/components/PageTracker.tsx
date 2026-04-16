'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function PageTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const module = pathname.startsWith('/module/')
      ? pathname.split('/')[2] ?? null
      : null

    // Read language preference set by i18n context
    let lang = 'en'
    try {
      const stored = localStorage.getItem('lang')
      if (stored === 'zh' || stored === 'en') {
        lang = stored
      } else {
        lang = navigator.language.startsWith('zh') ? 'zh' : 'en'
      }
    } catch { /* SSR guard */ }

    fetch('/api/track', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ path: pathname, module, lang }),
    }).catch(() => { /* fire-and-forget */ })
  }, [pathname])

  return null
}

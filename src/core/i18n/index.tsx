'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export type Lang = 'zh' | 'en'

interface LangContextValue {
  lang:    Lang
  setLang: (l: Lang) => void
}

// ── UI string catalogue ────────────────────────────────────────────────────

export const UI = {
  zh: {
    // Homepage hero
    heroLine1:   '从混沌',
    heroLine2:   '到量子',
    heroLine3:   '引力。',
    heroSub1:    '交互式物理实验。',
    heroSub2:    '浏览器原生计算。',
    selectPrompt:'选择模块 ←',

    // Module page
    loading:     '加载中…',
    notFound:    '模块未找到：',

    // Sidebar categories
    catClassical:  'CLASSICAL MECHANICS',
    catQuantum:    'QUANTUM MECHANICS',
    catAstro:      'ASTROPHYSICS',
    catGR:         'GENERAL RELATIVITY',
    catString:     'STRING THEORY',

    // Sidebar footer
    theoryTree:  '理论发展树',
    soon:        'SOON',

    // Lang toggle
    langToggle:  'EN',
  },
  en: {
    // Homepage hero
    heroLine1:   'From chaos',
    heroLine2:   'to quantum',
    heroLine3:   'gravity.',
    heroSub1:    'Interactive physics experiments.',
    heroSub2:    'Browser-native computation.',
    selectPrompt:'select a module ←',

    // Module page
    loading:     'Loading…',
    notFound:    'Module not found: ',

    // Sidebar categories (same — already English)
    catClassical:  'CLASSICAL MECHANICS',
    catQuantum:    'QUANTUM MECHANICS',
    catAstro:      'ASTROPHYSICS',
    catGR:         'GENERAL RELATIVITY',
    catString:     'STRING THEORY',

    // Sidebar footer
    theoryTree:  'Theory Tree',
    soon:        'SOON',

    // Lang toggle
    langToggle:  '中',
  },
} as const

// ── Context ────────────────────────────────────────────────────────────────

const LangContext = createContext<LangContextValue>({ lang: 'zh', setLang: () => {} })

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh')

  // On mount: read localStorage, then fall back to browser language
  useEffect(() => {
    const stored = localStorage.getItem('lang') as Lang | null
    if (stored === 'zh' || stored === 'en') {
      setLangState(stored)
    } else {
      const browser = (navigator.language || '').toLowerCase()
      setLangState(browser.startsWith('zh') ? 'zh' : 'en')
    }
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
  }, [])

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useLang() {
  return useContext(LangContext)
}

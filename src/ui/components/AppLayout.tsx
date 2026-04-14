'use client'
// ── AppLayout ──────────────────────────────────────────────────────────────
// Shared shell with hover-triggered sidebar overlay.
//
// Desktop: sidebar is a fixed overlay (z-50). An invisible 16px edge-strip on
//   the left triggers it on hover. Once visible, mousing out of the sidebar
//   starts a 2 s auto-hide timer (cancelled if mouse returns).
// Mobile:  hamburger button opens a fixed drawer overlay; backdrop tap closes.

import { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'

interface Props {
  children: React.ReactNode
  mainClassName?: string
}

export default function AppLayout({ children, mainClassName = 'flex-1 relative overflow-hidden' }: Props) {
  const [mobileOpen,     setMobileOpen]     = useState(false)
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showSidebar = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setSidebarVisible(true)
  }, [])

  const scheduleSidebarHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setSidebarVisible(false), 2000)
  }, [])

  // Clean up timer on unmount
  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
  }, [])

  const handleHamburger = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((v) => !v)
    } else {
      // On desktop: toggle sidebar visibility
      if (sidebarVisible) {
        setSidebarVisible(false)
      } else {
        showSidebar()
      }
    }
  }

  return (
    <div className="flex h-screen bg-[#080808] text-[#f0ede8] overflow-hidden">

      {/* ── Mobile backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Desktop: invisible left-edge hover strip (triggers sidebar) ── */}
      <div
        className="fixed left-0 top-0 w-4 h-full z-40 hidden md:block"
        onMouseEnter={showSidebar}
      />

      {/* ── Desktop sidebar: hover-triggered fixed overlay ── */}
      <div
        className={[
          'fixed inset-y-0 left-0 z-50 hidden md:block',
          'transition-transform duration-300 ease-in-out',
          sidebarVisible ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        onMouseEnter={showSidebar}
        onMouseLeave={scheduleSidebarHide}
      >
        <Sidebar onCollapse={() => setSidebarVisible(false)} />
      </div>

      {/* ── Mobile sidebar: fixed drawer ── */}
      <div className={[
        'md:hidden fixed inset-y-0 left-0 z-50',
        'transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <Sidebar onClose={() => setMobileOpen(false)} />
      </div>

      {/* ── Main (fills entire viewport — sidebar is now overlay) ── */}
      <main className={mainClassName}>

        {/* Hamburger / toggle — always visible top-left */}
        <button
          aria-label="Toggle navigation"
          onClick={handleHamburger}
          className="absolute top-4 left-4 z-30 flex flex-col gap-[5px] p-1.5 hover:opacity-80 transition-opacity"
        >
          {mobileOpen ? (
            <span className="text-[#f0ede8]/55 text-base leading-none">✕</span>
          ) : (
            <>
              <span className="w-5 h-px bg-[#f0ede8]/50 block" />
              <span className="w-5 h-px bg-[#f0ede8]/50 block" />
              <span className="w-3.5 h-px bg-[#f0ede8]/50 block" />
            </>
          )}
        </button>

        {children}
      </main>
    </div>
  )
}

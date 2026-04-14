'use client'
// ── AppLayout ──────────────────────────────────────────────────────────────
// Shared shell: collapsible sidebar + mobile drawer + backdrop.
//
// Desktop: sidebar is always in the flex flow; clicking ‹ inside the sidebar
//   OR the ☰ button in the main area collapses it (width → 0).
// Mobile:  sidebar is a fixed overlay; hamburger / ‹ toggles it.

import { useState } from 'react'
import Sidebar from './Sidebar'

interface Props {
  children: React.ReactNode
  mainClassName?: string
}

export default function AppLayout({ children, mainClassName = 'flex-1 relative overflow-hidden' }: Props) {
  const [mobileOpen,       setMobileOpen]       = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  // Unified toggle: mobile vs desktop decided at click-time so no SSR mismatch
  const handleToggle = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setMobileOpen((v) => !v)
    } else {
      setDesktopCollapsed((v) => !v)
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

      {/* ── Desktop sidebar: in-flow, width transitions to 0 when collapsed ── */}
      <div className={[
        'hidden md:block flex-shrink-0 overflow-hidden',
        'transition-all duration-300 ease-in-out',
        desktopCollapsed ? 'w-0' : 'w-60',
      ].join(' ')}>
        {/* Inner div keeps its fixed width so the outer clips smoothly */}
        <div className="w-60 h-full">
          <Sidebar
            onCollapse={() => setDesktopCollapsed(true)}
          />
        </div>
      </div>

      {/* ── Mobile sidebar: fixed drawer ── */}
      <div className={[
        'md:hidden fixed inset-y-0 left-0 z-50',
        'transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}>
        <Sidebar
          onClose={() => setMobileOpen(false)}
        />
      </div>

      {/* ── Main ── */}
      <main className={mainClassName}>

        {/* Unified toggle button — always visible top-left */}
        <button
          aria-label="Toggle navigation"
          onClick={handleToggle}
          className="absolute top-4 left-4 z-30 flex flex-col gap-[5px] p-1.5 hover:opacity-80 transition-opacity"
        >
          {/* Show X on mobile-open; show ☰ otherwise */}
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

'use client'
// ── AppLayout ──────────────────────────────────────────────────────────────
// Shared shell: sidebar drawer + mobile hamburger + backdrop overlay.
// On desktop the sidebar is always visible.
// On mobile the sidebar slides in from the left on hamburger tap.

import { useState } from 'react'
import Sidebar from './Sidebar'

interface Props {
  children: React.ReactNode
  /** Extra classes for the main content wrapper */
  mainClassName?: string
}

export default function AppLayout({ children, mainClassName = 'flex-1 relative overflow-hidden' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#080808] text-[#f0ede8] overflow-hidden">

      {/* ── Mobile backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar: drawer on mobile, static column on desktop ── */}
      <div className={[
        'fixed inset-y-0 left-0 z-50',
        'md:relative md:z-auto md:translate-x-0',
        'transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ].join(' ')}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* ── Main ── */}
      <main className={mainClassName}>

        {/* Hamburger — mobile only */}
        <button
          aria-label="Open navigation"
          onClick={() => setOpen(true)}
          className="absolute top-5 left-5 z-30 md:hidden flex flex-col gap-[5px] p-1"
        >
          <span className="w-5 h-px bg-[#f0ede8]/55 block" />
          <span className="w-5 h-px bg-[#f0ede8]/55 block" />
          <span className="w-3.5 h-px bg-[#f0ede8]/55 block" />
        </button>

        {children}
      </main>

    </div>
  )
}

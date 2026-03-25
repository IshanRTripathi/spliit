'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'

export function TopAppBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-16 bg-white/70 backdrop-blur-xl border-b border-border/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden border-2 border-white shadow-sm" />
        <span className="text-2xl font-extrabold tracking-tight text-primary-gradient">
          Split
        </span>
      </div>

      <Link
        href="/groups"
        aria-label="Search groups"
        className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-low transition-colors active:scale-95"
      >
        <Search className="h-5 w-5 text-muted-foreground" />
      </Link>
    </header>
  )
}


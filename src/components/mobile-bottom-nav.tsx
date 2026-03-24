'use client'

import { cn } from '@/lib/utils'
import { Activity, Home, UserCircle2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MobileBottomNav() {
  const pathname = usePathname()
  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/groups', label: 'Groups', icon: Activity },
    { href: '/profile', label: 'Settings', icon: UserCircle2 },
  ]

  return (
    <nav className="fixed bottom-2 left-2 right-2 z-50 sm:hidden">
      <div
        className={cn(
          'glass-surface rounded-2xl px-1 py-1 grid',
          'grid-cols-3',
        )}
      >
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[11px] transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

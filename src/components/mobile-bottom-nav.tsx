'use client'

import { cn } from '@/lib/utils'
import { Home, Settings, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function MobileBottomNav() {
  const pathname = usePathname()
  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/groups', label: 'Groups', icon: Users },
    { href: '/profile', label: 'Settings', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      <div className="w-full flex justify-around items-center px-4 pb-8 pt-4 bg-white/70 backdrop-blur-xl border-t border-border/40 rounded-t-[32px] shadow-[0_-10px_30px_rgba(0,0,0,0.04)]">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center transition-all active:scale-90 duration-200 px-5 py-2 rounded-2xl',
                active
                  ? 'bg-magenta-gradient text-white shadow-lg'
                  : 'text-stone-400 hover:text-primary',
              )}
            >
              <Icon className={cn('h-5 w-5', active ? 'text-white' : '')} />
              <span className="text-[10px] font-semibold uppercase tracking-wider mt-1">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

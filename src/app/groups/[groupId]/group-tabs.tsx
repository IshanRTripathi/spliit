'use client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'

type Props = {
  groupId: string
}

export function GroupTabs({ groupId }: Props) {
  const t = useTranslations()
  const pathname = usePathname()
  const currentSegment =
    pathname.match(/^\/groups\/[^/]+\/([^/]+)/)?.[1] ?? 'expenses'
  const router = useRouter()
  const tabs = [
    { value: 'expenses', label: t('Expenses.title') },
    { value: 'balances', label: t('Balances.title') },
    { value: 'stats', label: t('Stats.title') },
    { value: 'edit', label: t('Settings.title') },
  ] as const

  return (
    <div className="w-full overflow-x-auto">
      <div className="inline-flex min-w-full items-center gap-1.5 rounded-2xl border border-border/70 bg-card/85 p-1.5 shadow-sm">
        {tabs.map((tab) => {
          const isActive = currentSegment === tab.value
          return (
            <Button
              key={tab.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/groups/${groupId}/${tab.value}`)}
              className={cn(
                'h-9 rounded-xl px-3 whitespace-nowrap text-xs sm:text-sm transition-colors',
                isActive
                  ? 'bg-magenta-gradient text-white shadow-lg'
                  : 'bg-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

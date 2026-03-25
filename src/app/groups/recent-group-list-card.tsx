import { Button } from '@/components/ui/button'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export function RecentGroupListCard({
  group,
}: {
  group: AppRouterOutput['groups']['list']['groups'][number]
}) {
  const memberTotal = group._count.participants
  const visible = Math.min(3, memberTotal)
  const remaining = Math.max(0, memberTotal - visible)

  const initials = group.name
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => (w[0] ?? '?').toUpperCase())

  return (
    <li>
      <div className="rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-magenta-gradient text-white flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="font-extrabold text-lg">
                {(initials[0] ?? '?').slice(0, 1)}
              </span>
            </div>

            <div className="min-w-0">
              <Link href={`/groups/${group.id}`} className="block">
                <p className="text-lg font-extrabold leading-tight truncate">
                  {group.name}
                </p>
              </Link>
              <p className="text-xs text-muted-foreground mt-1">
                Split with {memberTotal} people
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex -space-x-2">
                  {Array.from({ length: visible }).map((_, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-8 rounded-full border border-border/70 bg-surface-container-lowest flex items-center justify-center text-[11px] font-bold text-muted-foreground"
                    >
                      {initials[idx] ?? (idx === 0 ? 'A' : idx === 1 ? 'B' : 'C')}
                    </div>
                  ))}
                  {remaining > 0 ? (
                    <div className="w-8 h-8 rounded-full border border-border/70 bg-surface-container-lowest flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                      +{remaining}
                    </div>
                  ) : null}
                </div>

                <div className="text-right">
                  <p className="text-base font-extrabold text-primary">$0.00</p>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                    Debt
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            asChild
            className="h-10 rounded-full bg-magenta-gradient text-white shadow-lg px-4"
          >
            <Link href={`/groups/${group.id}/balances`} className="flex items-center gap-2">
              Settle Up
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </li>
  )
}

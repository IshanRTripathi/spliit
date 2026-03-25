import { Balances } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { useLocale } from 'next-intl'

type Props = {
  balances: Balances
  participants: Participant[]
  currency: Currency
}

export function BalancesList({ balances, participants, currency }: Props) {
  const locale = useLocale()
  const maxBalance = Math.max(
    ...Object.values(balances).map((b) => Math.abs(b.total)),
  )

  return (
    <div className="text-sm">
      {participants.map((participant) => {
        const balance = balances[participant.id]?.total ?? 0
        const isLeft = balance >= 0
        return (
          <div
            key={participant.id}
            className={cn('flex', isLeft || 'flex-row-reverse')}
          >
            <div className={cn('w-1/2 p-2', isLeft && 'text-right')}>
              {participant.name}
            </div>
            <div className={cn('w-1/2 relative', isLeft || 'text-right')}>
              <div className="absolute inset-0 p-2 z-20">
                {formatCurrency(currency, balance, locale)}
              </div>
              {balance !== 0 && (
                <div
                  className={cn(
                    'absolute top-1 h-7 z-10',
                    isLeft
                      ? 'bg-primary/15 dark:bg-primary/25 left-0 rounded-r-lg border border-primary/25 dark:border-primary/35'
                      : 'bg-destructive/15 dark:bg-destructive/25 right-0 rounded-l-lg border border-destructive/25 dark:border-destructive/35',
                  )}
                  style={{
                    width: (Math.abs(balance) / maxBalance) * 100 + '%',
                  }}
                ></div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

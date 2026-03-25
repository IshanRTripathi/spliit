'use client'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale } from 'next-intl'

type Props = {
  currency: Currency
  amount: number
  bold?: boolean
  colored?: boolean
}

export function Money({
  currency,
  amount,
  bold = false,
  colored = false,
}: Props) {
  const locale = useLocale()
  return (
    <span
      className={cn(
        colored && amount < 0
          ? 'text-status-negative'
          : colored && amount > 0
            ? 'text-status-positive'
          : '',
        bold && 'font-bold',
      )}
    >
      {formatCurrency(currency, amount, locale)}
    </span>
  )
}

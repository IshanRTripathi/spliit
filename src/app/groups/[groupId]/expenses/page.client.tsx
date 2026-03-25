'use client'

import { ActiveUserModal } from '@/app/groups/[groupId]/expenses/active-user-modal'
import { CreateFromReceiptButton } from '@/app/groups/[groupId]/expenses/create-from-receipt-button'
import { ExpenseList } from '@/app/groups/[groupId]/expenses/expense-list'
import ExportButton from '@/app/groups/[groupId]/export-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus } from 'lucide-react'
import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useCurrentGroup } from '../current-group-context'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Expenses',
}

export default function GroupExpensesPageClient({
  enableReceiptExtract,
}: {
  enableReceiptExtract: boolean
}) {
  const t = useTranslations('Expenses')
  const { groupId, group } = useCurrentGroup()
  const [viewCurrency, setViewCurrency] = useState<'ORIGINAL' | 'BASE' | 'DEST'>('ORIGINAL')
  
  const hasDestinationCurrency = 
    group?.currencyCode && 
    group?.destinationCurrencyCode && 
    group.currencyCode !== group.destinationCurrencyCode &&
    group.exchangeRate

  return (
    <>
      <Card className="mb-20 sm:mb-4">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <CardHeader className="flex-1 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <span>{t('title')}</span>
              <ExportButton groupId={groupId} />
              {hasDestinationCurrency && (
                <div className="flex rounded-full bg-[#E9E9EB] p-[2px] text-xs">
                  <button
                    type="button"
                    onClick={() => setViewCurrency('ORIGINAL')}
                    className={cn(
                      'px-2 py-1 text-[11px] rounded-full transition-colors',
                      viewCurrency === 'ORIGINAL'
                        ? 'bg-white text-[#D81B60] shadow-sm'
                        : 'text-[#8E8E93]',
                    )}
                  >
                    Original
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewCurrency('BASE')}
                    className={cn(
                      'px-2 py-1 text-[11px] rounded-full transition-colors',
                      viewCurrency === 'BASE'
                        ? 'bg-white text-[#D81B60] shadow-sm'
                        : 'text-[#8E8E93]',
                    )}
                  >
                    {group.currencyCode}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewCurrency('DEST')}
                    className={cn(
                      'px-2 py-1 text-[11px] rounded-full transition-colors',
                      viewCurrency === 'DEST'
                        ? 'bg-white text-[#D81B60] shadow-sm'
                        : 'text-[#8E8E93]',
                    )}
                  >
                    {group.destinationCurrencyCode}
                  </button>
                </div>
              )}
            </CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardHeader className="px-4 pt-0 pb-2 sm:p-6 flex flex-row space-y-0 gap-2">
            {enableReceiptExtract && <CreateFromReceiptButton />}
            <Button asChild size="icon" className="hidden sm:inline-flex">
              <Link
                href={`/groups/${groupId}/expenses/create`}
                title={t('create')}
              >
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </CardHeader>
        </div>

        <CardContent className="p-0 pt-2 pb-4 sm:pb-6 flex flex-col gap-4 relative">
          <ExpenseList viewCurrency={viewCurrency} />
        </CardContent>
      </Card>

      <div className="fixed bottom-3 left-3 right-3 z-40 sm:hidden">
        <Button asChild size="lg" className="w-full shadow-lg">
          <Link href={`/groups/${groupId}/expenses/create`} title={t('create')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('create')}
          </Link>
        </Button>
      </div>

      <ActiveUserModal groupId={groupId} />
    </>
  )
}

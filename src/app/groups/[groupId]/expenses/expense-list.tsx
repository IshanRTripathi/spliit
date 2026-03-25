'use client'
import { ExpenseCard } from '@/app/groups/[groupId]/expenses/expense-card'
import { getGroupExpensesAction } from '@/app/groups/[groupId]/expenses/expense-list-fetch-action'
import { Button } from '@/components/ui/button'
import { SearchBar } from '@/components/ui/search-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import dayjs, { type Dayjs } from 'dayjs'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { forwardRef, useEffect, useMemo, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useDebounce } from 'use-debounce'
import { useCurrentGroup } from '../current-group-context'

const PAGE_SIZE = 20

type ExpensesType = NonNullable<
  Awaited<ReturnType<typeof getGroupExpensesAction>>
>

const EXPENSE_GROUPS = {
  UPCOMING: 'upcoming',
  THIS_WEEK: 'thisWeek',
  EARLIER_THIS_MONTH: 'earlierThisMonth',
  LAST_MONTH: 'lastMonth',
  EARLIER_THIS_YEAR: 'earlierThisYear',
  LAST_YEAR: 'lastYear',
  OLDER: 'older',
}

function getExpenseGroup(date: Dayjs, today: Dayjs) {
  if (today.isBefore(date)) {
    return EXPENSE_GROUPS.UPCOMING
  } else if (today.isSame(date, 'week')) {
    return EXPENSE_GROUPS.THIS_WEEK
  } else if (today.isSame(date, 'month')) {
    return EXPENSE_GROUPS.EARLIER_THIS_MONTH
  } else if (today.subtract(1, 'month').isSame(date, 'month')) {
    return EXPENSE_GROUPS.LAST_MONTH
  } else if (today.isSame(date, 'year')) {
    return EXPENSE_GROUPS.EARLIER_THIS_YEAR
  } else if (today.subtract(1, 'year').isSame(date, 'year')) {
    return EXPENSE_GROUPS.LAST_YEAR
  } else {
    return EXPENSE_GROUPS.OLDER
  }
}

function getGroupedExpensesByDate(expenses: ExpensesType) {
  const today = dayjs()
  return expenses.reduce((result: { [key: string]: ExpensesType }, expense) => {
    const expenseGroup = getExpenseGroup(dayjs(expense.expenseDate), today)
    result[expenseGroup] = result[expenseGroup] ?? []
    result[expenseGroup].push(expense)
    return result
  }, {})
}

export function ExpenseList({ viewCurrency = 'ORIGINAL' }: { viewCurrency?: 'ORIGINAL' | 'BASE' | 'DEST' }) {
  const { groupId, group } = useCurrentGroup()
  const [searchText, setSearchText] = useState('')
  const [debouncedSearchText] = useDebounce(searchText, 300)

  const participants = group?.participants

  useEffect(() => {
    if (!participants) return

    const activeUser = localStorage.getItem('newGroup-activeUser')
    const newUser = localStorage.getItem(`${groupId}-newUser`)
    if (activeUser || newUser) {
      localStorage.removeItem('newGroup-activeUser')
      localStorage.removeItem(`${groupId}-newUser`)
      if (activeUser === 'None') {
        localStorage.setItem(`${groupId}-activeUser`, 'None')
      } else {
        const userId = participants.find(
          (p) => p.name === (activeUser || newUser),
        )?.id
        if (userId) {
          localStorage.setItem(`${groupId}-activeUser`, userId)
        }
      }
    }
  }, [groupId, participants])

  return (
    <>
      <SearchBar onValueChange={(value) => setSearchText(value)} />
      <ExpenseListForSearch
        groupId={groupId}
        searchText={debouncedSearchText}
        viewCurrency={viewCurrency}
      />
    </>
  )
}

const ExpenseListForSearch = ({
  groupId,
  searchText,
  viewCurrency = 'ORIGINAL',
}: {
  groupId: string
  searchText: string
  viewCurrency?: 'ORIGINAL' | 'BASE' | 'DEST'
}) => {
  const utils = trpc.useUtils()
  const { group } = useCurrentGroup()

  useEffect(() => {
    // Until we use tRPC more widely and can invalidate the cache on expense
    // update, it's easier and safer to invalidate the cache on page load.
    utils.groups.expenses.invalidate()
  }, [utils])

  const t = useTranslations('Expenses')
  const { ref: loadingRef, inView } = useInView()

  const {
    data,
    isLoading: expensesAreLoading,
    fetchNextPage,
  } = trpc.groups.expenses.list.useInfiniteQuery(
    // Keep server query stable (no API call on each keystroke).
    { groupId, limit: PAGE_SIZE, filter: '' },
    { getNextPageParam: ({ nextCursor }) => nextCursor },
  )
  const expenses = data?.pages.flatMap((page) => page.expenses)
  const hasMore = (data?.pages.at(-1)?.hasMore ?? false) && !searchText.trim()

  const isLoading = expensesAreLoading || !expenses || !group

  useEffect(() => {
    if (inView && hasMore && !isLoading) fetchNextPage()
  }, [fetchNextPage, hasMore, inView, isLoading])

  const filteredExpenses = useMemo(() => {
    if (!expenses) return []
    const q = searchText.trim().toLowerCase()
    if (!q) return expenses

    return expenses.filter((e) => {
      const title = e.title?.toLowerCase() ?? ''
      const categoryName = e.category?.name?.toLowerCase() ?? ''
      const categoryGrouping = e.category?.grouping?.toLowerCase() ?? ''
      return (
        title.includes(q) || categoryName.includes(q) || categoryGrouping.includes(q)
      )
    })
  }, [expenses, searchText])

  const groupedExpensesByDate = useMemo(
    () => getGroupedExpensesByDate(filteredExpenses),
    [filteredExpenses],
  )

  if (isLoading) return <ExpensesLoading />

  if (filteredExpenses.length === 0)
    return (
      <p className="px-6 text-sm py-6">
        {t('noExpenses')}{' '}
        <Button variant="link" asChild className="-m-4">
          <Link href={`/groups/${groupId}/expenses/create`}>
            {t('createFirst')}
          </Link>
        </Button>
      </p>
    )

  const groupCurrency = getCurrencyFromGroup(group)
  const groupExchangeRate = group.exchangeRate ? Number(group.exchangeRate) : undefined
  const baseCurrencyCode = group.currencyCode ?? undefined
  const destCurrencyCode = group.destinationCurrencyCode ?? undefined

  return (
    <>
      {Object.values(EXPENSE_GROUPS).map((expenseGroup: string) => {
        let groupExpenses = groupedExpensesByDate[expenseGroup]
        if (!groupExpenses || groupExpenses.length === 0) return null

        return (
          <div key={expenseGroup}>
            <div
              className={
                'text-muted-foreground text-xs pl-4 sm:pl-6 py-1 font-semibold sticky top-16 bg-white dark:bg-zinc-950'
              }
            >
              {t(`Groups.${expenseGroup}`)}
            </div>
            {groupExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                currency={groupCurrency}
                groupId={groupId}
                participantCount={group.participants.length}
                viewCurrency={viewCurrency}
                exchangeRate={groupExchangeRate}
                baseCurrencyCode={baseCurrencyCode}
                destCurrencyCode={destCurrencyCode}
              />
            ))}
          </div>
        )
      })}
      {hasMore && <ExpensesLoading ref={loadingRef} />}
    </>
  )
}

const ExpensesLoading = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref}>
      <Skeleton className="mx-4 sm:mx-6 mt-1 mb-2 h-3 w-32 rounded-full" />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex justify-between items-start px-2 sm:px-6 py-4 text-sm gap-2"
        >
          <div className="flex-0 pl-2 pr-1">
            <Skeleton className="h-4 w-4 rounded-full" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
          <div className="flex-0 flex flex-col gap-2 items-end mr-2 sm:mr-12">
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
})
ExpensesLoading.displayName = 'ExpensesLoading'

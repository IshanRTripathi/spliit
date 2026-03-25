'use client'

import { getRecentGroups } from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AUTH_COOKIE, AUTH_USER_COOKIE } from '@/lib/auth'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { trpc } from '@/trpc/client'
import { ArrowDownRight, ArrowUpRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

function getCookieValue(name: string) {
  return (
    document.cookie
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=') ?? ''
  )
}

export function HomeDashboard() {
  const t = useTranslations('Activity')
  const locale = useLocale()
  const router = useRouter()

  const [userIdentifier, setUserIdentifier] = useState<string>('')
  const [lastGroupId, setLastGroupId] = useState<string | undefined>(undefined)
  const [activeParticipantId, setActiveParticipantId] = useState<
    string | undefined
  >(undefined)
  const [authChecked, setAuthChecked] = useState(false)

  useEffect(() => {
    const isSignedIn = document.cookie.includes(`${AUTH_COOKIE}=1`)
    if (!isSignedIn) {
      const next =
        window.location.pathname + (window.location.search ?? '')
      router.replace(
        `/signin?next=${encodeURIComponent(next || '/')}`,
      )
      return
    }
    setAuthChecked(true)
  }, [router])

  useEffect(() => {
    const raw = getCookieValue(AUTH_USER_COOKIE)
    setUserIdentifier(raw ? decodeURIComponent(raw) : '')

    try {
      const recent = getRecentGroups()
      setLastGroupId(recent[0]?.id)
    } catch {
      setLastGroupId(undefined)
    }
  }, [])

  const { data: lastGroupData, isLoading: groupIsLoading } =
    trpc.groups.get.useQuery(
      { groupId: lastGroupId ?? '' },
      { enabled: !!lastGroupId },
    )

  const participants = lastGroupData?.group?.participants ?? []

  useEffect(() => {
    if (!lastGroupId || !participants.length) return
    const stored = localStorage.getItem(`${lastGroupId}-activeUser`)
    if (!stored || stored === 'None' || stored === 'none') {
      setActiveParticipantId(participants[0]?.id)
      return
    }
    setActiveParticipantId(stored)
  }, [lastGroupId, participants])

  const { data: balancesData, isLoading: balancesAreLoading } =
    trpc.groups.balances.list.useQuery(
      { groupId: lastGroupId ?? '' },
      { enabled: !!lastGroupId },
    )

  const currency = useMemo(() => {
    const group = lastGroupData?.group
    if (!group) return null
    return getCurrencyFromGroup(group)
  }, [lastGroupData])

  const balances = balancesData?.balances ?? {}
  const showActive = Boolean(lastGroupId && activeParticipantId)
  const activeTotalMinor = useMemo(() => {
    if (!showActive || !activeParticipantId) return undefined
    return balances[activeParticipantId]?.total
  }, [balances, showActive, activeParticipantId])

  const owedTotalMinor = useMemo(() => {
    if (activeTotalMinor === undefined) return 0
    return activeTotalMinor > 0 ? activeTotalMinor : 0
  }, [activeTotalMinor])

  const oweTotalMinor = useMemo(() => {
    if (activeTotalMinor === undefined) return 0
    return activeTotalMinor < 0 ? Math.abs(activeTotalMinor) : 0
  }, [activeTotalMinor])

  const netMinor = useMemo(() => {
    if (activeTotalMinor === undefined) return 0
    return activeTotalMinor
  }, [activeTotalMinor])

  const { data: activitiesData, isLoading: activitiesAreLoading } =
    trpc.groups.activities.list.useInfiniteQuery(
      { groupId: lastGroupId ?? '', limit: 5 },
      {
        enabled: !!lastGroupId,
        getNextPageParam: ({ nextCursor }) => nextCursor,
      },
    )

  const activities = activitiesData?.pages.flatMap((p) => p.activities) ?? []

  const userDisplayName = useMemo(() => {
    const raw = userIdentifier?.trim()
    if (!raw) return ''
    const base = raw.includes('@') ? raw.split('@')[0] : raw
    return base.slice(0, 50)
  }, [userIdentifier])

  const addExpenseHref = lastGroupId
    ? `/groups/${lastGroupId}/expenses/create`
    : `/groups/create`

  function relativeTime(from: Date) {
    const diffMs = Date.now() - from.getTime()
    const s = Math.max(0, Math.floor(diffMs / 1000))
    if (s < 60) return 'Just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    return `${d}d ago`
  }

  const netText = useMemo(() => {
    if (!currency || !showActive) return '...'
    if (netMinor === 0) return formatCurrency(currency, 0, locale)
    const sign = netMinor > 0 ? '+' : '-'
    return `${sign}${formatCurrency(currency, Math.abs(netMinor), locale)}`
  }, [currency, netMinor, locale, showActive])

  if (!authChecked) return null

  return (
    <main className="px-4 pb-28">
      <section className="pt-3 space-y-2">
        <p className="text-sm text-muted-foreground">{userDisplayName ? `Hello, ${userDisplayName}` : 'Hello'}</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Your Summary</h1>
      </section>

      <section className="mt-4">
          <div className="rounded-[28px] bg-magenta-gradient p-6 text-white shadow-lg">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
            Total Balance
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            {balancesAreLoading || !currency ? (
              <Skeleton className="h-10 w-32 rounded-xl bg-white/20" />
            ) : (
              <span className="text-4xl font-extrabold tracking-tight">{netText}</span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 neumorphic-recessed">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                You are owed
              </p>
              <p className="text-xl font-extrabold">
                {balancesAreLoading || !currency
                  ? '...'
                  : formatCurrency(currency, owedTotalMinor, locale)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 border border-white/15 p-3 neumorphic-recessed">
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                You owe
              </p>
              <p className="text-xl font-extrabold">
                {balancesAreLoading || !currency
                  ? '...'
                  : formatCurrency(currency, oweTotalMinor, locale)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Button
          asChild
          className="h-14 rounded-2xl bg-surface-container-lowest/90 justify-start shadow-sm"
          variant="secondary"
        >
          <Link href={addExpenseHref}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Link>
        </Button>
        <Button
          asChild
          className="h-14 rounded-2xl bg-surface-container-lowest/90 justify-start shadow-sm"
          variant="secondary"
        >
          <Link href="/groups/create">
            <Plus className="mr-2 h-4 w-4" />
            New Group
          </Link>
        </Button>
      </section>

      <section className="mt-6 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Recent Activity
          </h2>
          {lastGroupId ? (
            <Link
              href={`/groups/${lastGroupId}/edit`}
              className="text-xs font-bold text-primary uppercase tracking-widest"
            >
              See all
            </Link>
          ) : null}
        </div>

        {!lastGroupId ? (
          <div className="rounded-2xl border border-border/70 bg-card/80 p-4 text-sm text-muted-foreground">
            Create a group to see activity.
          </div>
        ) : activitiesAreLoading || groupIsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
            {t('noActivity')}
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 3).map((activity) => {
              const a = activity as any
              const participant = a.participantId
                ? participants.find((p) => p.id === a.participantId)
                : undefined
              const participantName = participant?.name ?? t('someone')

              const expense = a.expense as any | undefined
              const amountMinor = typeof expense?.amount === 'number' ? expense.amount : 0
              const paidById = expense?.paidById as string | null | undefined

              const userOwes =
                activeParticipantId && paidById
                  ? paidById !== activeParticipantId
                  : false

              const sign = userOwes ? '-' : '+'
              const label = userOwes ? 'You owe' : 'You are owed'
              const amountText =
                currency && amountMinor
                  ? `${sign}${formatCurrency(currency, Math.abs(amountMinor), locale)}`
                  : '...'

              return (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/80 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest border border-border/70 flex items-center justify-center font-bold text-muted-foreground">
                      {(participantName.trim()?.[0] ?? '?').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {participantName} {a.activityType === 'CREATE_EXPENSE' ? 'added' : 'updated'} {a.data ?? ''}
                      </p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <p
                      className={
                        sign === '+'
                          ? 'text-primary font-extrabold'
                          : 'text-destructive font-extrabold'
                      }
                    >
                      {amountText}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      {a.time ? relativeTime(new Date(a.time)) : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-3xl bg-card/80 border border-border/70 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Spending</h3>
            <div className="w-10 h-10 rounded-2xl bg-surface-container-lowest border border-border/70 flex items-center justify-center">
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">+12% this month</p>
        </div>
        <div className="rounded-3xl bg-card/80 border border-border/70 p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Settled</h3>
            <div className="w-10 h-10 rounded-2xl bg-surface-container-lowest border border-border/70 flex items-center justify-center">
              <ArrowDownRight className="h-4 w-4 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">3 debts this month</p>
        </div>
      </section>

      <button
        className="fixed bottom-24 right-6 w-16 h-16 bg-magenta-gradient text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 active:scale-90 transition-all z-40"
        onClick={() => {
          window.location.href = addExpenseHref
        }}
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6" />
      </button>
    </main>
  )
}

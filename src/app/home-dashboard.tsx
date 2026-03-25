'use client'

import { getRecentGroups } from '@/app/groups/recent-groups-helpers'
import {
  ActivityItem,
  type Activity as ActivityType,
} from '@/app/groups/[groupId]/activity/activity-item'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AUTH_USER_COOKIE } from '@/lib/auth'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { Participant } from '@prisma/client'
import { trpc } from '@/trpc/client'
import { Activity, ArrowUpRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

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

  const { data: groupsData, isLoading: groupsAreLoading } =
    trpc.groups.list.useQuery()
  const groups = groupsData?.groups ?? []

  const [userIdentifier, setUserIdentifier] = useState<string>('')
  const [lastGroupId, setLastGroupId] = useState<string | undefined>(undefined)

  useEffect(() => {
    setUserIdentifier(() => {
      const raw = getCookieValue(AUTH_USER_COOKIE)
      return raw ? decodeURIComponent(raw) : ''
    })

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

  const { data: balancesData, isLoading: balancesAreLoading } =
    trpc.groups.balances.list.useQuery(
      { groupId: lastGroupId ?? '' },
      { enabled: !!lastGroupId },
    )

  const { data: activitiesData, isLoading: activitiesAreLoading } =
    trpc.groups.activities.list.useInfiniteQuery(
      { groupId: lastGroupId ?? '', limit: 3 },
      {
        enabled: !!lastGroupId,
        getNextPageParam: ({ nextCursor }) => nextCursor,
      },
    )

  const activities = activitiesData?.pages.flatMap((p) => p.activities) ?? []
  const lastGroupParticipants =
    lastGroupData?.group?.participants ?? []

  const getParticipant = (participantId: string | null): Participant | undefined =>
    participantId === null
      ? undefined
      : lastGroupParticipants.find((p) => p.id === participantId)

  const totalParticipants = useMemo(() => {
    return groups.reduce((sum, group) => sum + group._count.participants, 0)
  }, [groups])

  const currency = useMemo(() => {
    const group = lastGroupData?.group
    if (!group) return null
    return getCurrencyFromGroup(group)
  }, [lastGroupData])

  const balances = balancesData?.balances ?? {}
  const owedTotalMinor = useMemo(() => {
    return Object.values(balances).reduce(
      (sum, b) => (b.total > 0 ? sum + b.total : sum),
      0,
    )
  }, [balances])
  const oweTotalMinor = useMemo(() => {
    return Object.values(balances).reduce(
      (sum, b) => (b.total < 0 ? sum + Math.abs(b.total) : sum),
      0,
    )
  }, [balances])

  const netMinor = owedTotalMinor - oweTotalMinor

  const addExpenseHref = lastGroupId
    ? `/groups/${lastGroupId}/expenses/create`
    : undefined

  const userDisplayName = useMemo(() => {
    const raw = userIdentifier?.trim()
    if (!raw) return ''
    const base = raw.includes('@') ? raw.split('@')[0] : raw
    return base.slice(0, 50)
  }, [userIdentifier])

  return (
    <main className="px-3 sm:px-5">
      <section className="page-section p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {userDisplayName ? `Morning, ${userDisplayName} 👋` : 'Morning 👋'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track your shared expenses in one place.
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {addExpenseHref ? (
            <Button asChild variant="secondary" className="h-12 shrink-0 px-4 rounded-2xl">
              <Link href={addExpenseHref}>
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          ) : null}

          <Button asChild className="h-12 shrink-0 px-4 rounded-2xl">
            <Link href="/groups/create">
              <Plus className="mr-2 h-4 w-4" />
              New Group
            </Link>
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/70 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Total balance</p>
            <p className="text-xl font-semibold">
              {balancesAreLoading || !currency
                ? '...'
                : netMinor === 0
                  ? formatCurrency(currency, 0, locale)
                  : `${netMinor > 0 ? '+' : '-'}${formatCurrency(
                      currency,
                      Math.abs(netMinor),
                      locale,
                    )}`}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Total participants</p>
            <p className="text-xl font-semibold">
              {groupsAreLoading ? '...' : totalParticipants}
            </p>
          </div>
        </div>

        {lastGroupId ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border/70 bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">You are owed</p>
              <p className="text-base font-semibold">
                {balancesAreLoading || !currency
                  ? '...'
                  : formatCurrency(currency, owedTotalMinor, locale)}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card/80 p-3">
              <p className="text-xs text-muted-foreground">You owe</p>
              <p className="text-base font-semibold">
                {balancesAreLoading || !currency
                  ? '...'
                  : formatCurrency(currency, oweTotalMinor, locale)}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!lastGroupId ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                Create a group to see activity.
              </div>
            ) : activitiesAreLoading || groupIsLoading ? (
              <>
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </>
            ) : activities.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {t('noActivity')}
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="rounded-xl border border-border/70 bg-card/80 p-2"
                >
                  <ActivityItem
                    groupId={lastGroupId}
                    activity={activity as ActivityType}
                    participant={getParticipant(activity.participantId)}
                    dateStyle={undefined}
                  />
                </div>
              ))
            )}
            {lastGroupId ? (
              <Button asChild variant="secondary" className="w-full rounded-2xl h-11">
                <Link href={`/groups/${lastGroupId}/edit`}>
                  See all
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Groups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groupsAreLoading ? (
              <>
                <Skeleton className="h-16 w-full rounded-2xl" />
                <Skeleton className="h-16 w-full rounded-2xl" />
              </>
            ) : groups.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                No groups yet. Create one to get started.
              </div>
            ) : (
              groups.slice(0, 5).map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}/expenses`}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/80 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group._count.participants} participants
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

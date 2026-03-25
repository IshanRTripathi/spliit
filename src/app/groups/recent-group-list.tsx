'use client'
import { AddGroupByUrlButton } from '@/app/groups/add-group-by-url-button'
import {
  getArchivedGroups,
  getRecentGroups,
  getStarredGroups,
} from '@/app/groups/recent-groups-helpers'
import { Button } from '@/components/ui/button'
import { formatCurrency, getCurrencyFromGroup } from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { Loader2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { PropsWithChildren, useEffect, useMemo, useState } from 'react'
import { RecentGroupListCard } from './recent-group-list-card'

export type RecentGroupsState =
  | { status: 'pending' }
  | {
      status: 'partial'
      starredGroups: string[]
      archivedGroups: string[]
    }

function sortGroups({
  groups,
  starredGroups,
  archivedGroups,
}: {
  groups: AppRouterOutput['groups']['list']['groups']
  starredGroups: string[]
  archivedGroups: string[]
}) {
  const starredGroupInfo = []
  const groupInfo = []
  const archivedGroupInfo = []
  for (const group of groups) {
    if (starredGroups.includes(group.id)) {
      starredGroupInfo.push(group)
    } else if (archivedGroups.includes(group.id)) {
      archivedGroupInfo.push(group)
    } else {
      groupInfo.push(group)
    }
  }
  return {
    starredGroupInfo,
    groupInfo,
    archivedGroupInfo,
  }
}

export function RecentGroupList() {
  const [state, setState] = useState<RecentGroupsState>({ status: 'pending' })

  function loadGroups() {
    const starredGroups = getStarredGroups()
    const archivedGroups = getArchivedGroups()
    setState({
      status: 'partial',
      starredGroups,
      archivedGroups,
    })
  }

  useEffect(() => {
    loadGroups()
  }, [])

  if (state.status === 'pending') return null

  return (
    <RecentGroupList_
      starredGroups={state.starredGroups}
      archivedGroups={state.archivedGroups}
      refreshGroupsFromStorage={() => loadGroups()}
    />
  )
}

function RecentGroupList_({
  starredGroups,
  archivedGroups,
  refreshGroupsFromStorage,
}: {
  starredGroups: string[]
  archivedGroups: string[]
  refreshGroupsFromStorage: () => void
}) {
  const t = useTranslations('Groups')
  const { data, isLoading } = trpc.groups.list.useQuery()
  const dataGroups = data?.groups ?? []
  const [tab, setTab] = useState<'recent' | 'debt'>('recent')
  const [lastGroupId, setLastGroupId] = useState<string | undefined>(
    undefined,
  )

  const locale = useLocale()

  useEffect(() => {
    try {
      const recent = getRecentGroups()
      setLastGroupId(recent[0]?.id)
    } catch {
      setLastGroupId(undefined)
    }
  }, [])

  const { data: lastGroupData, isLoading: lastGroupIsLoading } =
    trpc.groups.get.useQuery(
      { groupId: lastGroupId ?? '' },
      { enabled: !!lastGroupId },
    )

  const { data: balancesData, isLoading: balancesAreLoading } =
    trpc.groups.balances.list.useQuery(
      { groupId: lastGroupId ?? '' },
      { enabled: !!lastGroupId },
    )

  const currency = useMemo(() => {
    if (!lastGroupData?.group) return null
    return getCurrencyFromGroup(lastGroupData.group)
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
  const totalOwedText = useMemo(() => {
    if (!currency) return '...'
    return formatCurrency(currency, Math.abs(netMinor), locale)
  }, [currency, netMinor, locale])

  if (isLoading || !data) {
    return (
      <main className="px-4 pb-28 pt-3">
        <div className="space-y-3">
          <div className="h-7 w-40 rounded-xl bg-surface-container-highest animate-pulse" />
          <div className="h-10 w-64 rounded-3xl bg-surface-container-highest animate-pulse" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-card/80 border border-border/70 p-4 animate-pulse"
            >
              <div className="h-3 w-24 bg-surface-container-highest rounded" />
              <div className="mt-3 h-8 w-24 bg-surface-container-highest rounded" />
            </div>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-3xl bg-card/80 border border-border/70 p-4 animate-pulse"
            >
              <div className="h-10 w-10 rounded-2xl bg-surface-container-highest" />
              <div className="mt-3 h-4 w-40 bg-surface-container-highest rounded" />
            </div>
          ))}
        </div>
      </main>
    )
  }

  if (data.groups.length === 0) {
    return (
      <main className="px-4 pb-28 pt-3">
        <section className="page-section p-4">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Your shared worlds
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('NoRecent.description')}
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link href="/groups/create">{t('NoRecent.create')}</Link>
            </Button>
          </div>
        </section>
      </main>
    )
  }

  const groupsForView = dataGroups
  const activeGroupsCount = groupsForView.length

  return (
    <main className="px-4 pb-28 pt-3">
      <section>
        <h2 className="text-4xl font-extrabold tracking-tighter leading-none">
          Your shared worlds,{' '}
          <span className="text-primary">perfectly split.</span>
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-card/80 border border-border/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              ACTIVE GROUPS
            </p>
            <p className="mt-2 text-3xl font-extrabold">{activeGroupsCount}</p>
            <div className="mt-2 h-[3px] w-14 rounded-full bg-magenta-gradient" />
          </div>

          <div className="rounded-3xl bg-card/80 border border-border/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Total owed
            </p>
            <p className="mt-2 text-3xl font-extrabold">
              {balancesAreLoading ? '...' : totalOwedText}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              +12% last month
            </p>
          </div>
        </div>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-extrabold">Groups</h3>
          <div className="flex gap-2">
            <button
              type="button"
              className={tab === 'recent'
                ? 'px-4 py-2 rounded-2xl text-white bg-magenta-gradient shadow-lg'
                : 'px-4 py-2 rounded-2xl text-muted-foreground bg-card/80 border border-border/70'}
              onClick={() => setTab('recent')}
            >
              Recent
            </button>
            <button
              type="button"
              className={tab === 'debt'
                ? 'px-4 py-2 rounded-2xl text-white bg-magenta-gradient shadow-lg'
                : 'px-4 py-2 rounded-2xl text-muted-foreground bg-card/80 border border-border/70'}
              onClick={() => setTab('debt')}
            >
              Debt
            </button>
          </div>
        </div>

        <div className="mt-4">
          <GroupList groups={groupsForView} />
        </div>
      </section>
    </main>
  )
}

function GroupList({
  groups,
}: {
  groups: AppRouterOutput['groups']['list']['groups']
}) {
  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <RecentGroupListCard
          key={group.id}
          group={group}
        />
      ))}
    </ul>
  )
}

function GroupsPage({
  children,
  reload,
}: PropsWithChildren<{ reload: () => void }>) {
  const t = useTranslations('Groups')
  return (
    <>
      <section className="page-section mb-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-bold text-2xl flex-1">
              <Link href="/groups">{t('myGroups')}</Link>
            </h1>
          </div>
          <div className="flex gap-2">
            <AddGroupByUrlButton reload={reload} />
            <Button asChild>
              <Link href="/groups/create">
                {t('create')}
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <div>{children}</div>
    </>
  )
}

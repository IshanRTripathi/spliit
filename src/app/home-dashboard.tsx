'use client'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { trpc } from '@/trpc/client'
import { ArrowRight, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

export function HomeDashboard() {
  const { data, isLoading } = trpc.groups.list.useQuery()
  const groups = data?.groups ?? []
  const [userIdentifier, setUserIdentifier] = useState<string>('')

  useEffect(() => {
    const cookieValue = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('expense_user='))
      ?.split('=')[1]
    setUserIdentifier(cookieValue ? decodeURIComponent(cookieValue) : '')
  }, [])

  const totalParticipants = useMemo(
    () => groups.reduce((sum, group) => sum + group._count.participants, 0),
    [groups],
  )

  return (
    <main className="px-3 sm:px-5">
      <section className="page-section p-4 sm:p-6">
        <h1 className="text-2xl font-bold tracking-tight">Morning 👋</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {userIdentifier
            ? `Signed in as ${userIdentifier}`
            : 'Track your shared expenses in one place.'}
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button asChild className="h-12 justify-start">
            <Link href="/groups">
              <Plus className="mr-2 h-4 w-4" />
              Add Split
            </Link>
          </Button>
          <Button asChild variant="secondary" className="h-12 justify-start">
            <Link href="/groups">
              <Users className="mr-2 h-4 w-4" />
              My Groups
            </Link>
          </Button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border/70 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Active groups</p>
            <p className="text-xl font-semibold">{isLoading ? '...' : groups.length}</p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card/80 p-3">
            <p className="text-xs text-muted-foreground">Total participants</p>
            <p className="text-xl font-semibold">
              {isLoading ? '...' : totalParticipants}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active Groups</CardTitle>
            <CardDescription>Your latest shared expenses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-14 w-full rounded-xl" />
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
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card/80 p-3"
                >
                  <div>
                    <p className="font-medium">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group._count.participants} participants
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

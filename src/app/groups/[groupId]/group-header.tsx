'use client'

import { GroupTabs } from '@/app/groups/[groupId]/group-tabs'
import { ShareButton } from '@/app/groups/[groupId]/share-button'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'
import { useCurrentGroup } from './current-group-context'

export const GroupHeader = () => {
  const { isLoading, groupId, group } = useCurrentGroup()
  const participants = group?.participants ?? []
  const visible = participants.slice(0, 3)
  const remaining = Math.max(0, participants.length - visible.length)

  return (
    <div className="page-section flex flex-col justify-between gap-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          <Link href={`/groups/${groupId}`}>
            {isLoading ? (
              <Skeleton className="mt-1.5 mb-1.5 h-5 w-32" />
            ) : (
              <div className="flex">{group.name}</div>
            )}
          </Link>
        </h1>
        {group && (
          <div className="flex items-center gap-2">
            <div className="flex items-center">
              <div className="flex -space-x-2">
                {visible.map((p, idx) => (
                  <div
                    // index is stable because we slice deterministically
                    key={`${p.id}-${idx}`}
                    className="h-8 w-8 rounded-full border border-border/70 bg-card/90 flex items-center justify-center text-[11px] font-semibold text-foreground"
                    style={{
                      // `surface-container-highest` in `newuicode.md`
                      backgroundColor: '#dadde0',
                      borderColor: '#ffffff',
                    }}
                  >
                    {(p.name?.trim()?.[0] ?? '?').toUpperCase()}
                  </div>
                ))}
                {remaining > 0 ? (
                  <div
                    className="h-8 w-8 rounded-full border border-border/70 bg-card/90 flex items-center justify-center text-[11px] font-semibold text-muted-foreground"
                    style={{
                      backgroundColor: '#dadde0',
                      borderColor: '#ffffff',
                    }}
                  >
                    +{remaining}
                  </div>
                ) : null}
              </div>
            </div>
            <ShareButton group={group} />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <GroupTabs groupId={groupId} />
        </div>
      </div>
    </div>
  )
}

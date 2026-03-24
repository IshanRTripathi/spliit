import { getActivities } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupActivitiesProcedure = authedProcedure
  .input(
    z.object({
      groupId: z.string(),
      cursor: z.number().optional().default(0),
      limit: z.number().optional().default(5),
    }),
  )
  .query(async ({ input: { groupId, cursor, limit }, ctx: { userIdentifier } }) => {
    const activities = await getActivities(
      groupId,
      userIdentifier,
      {
      offset: cursor,
      length: limit + 1,
      },
    )
    return {
      activities: activities.slice(0, limit),
      hasMore: !!activities[limit],
      nextCursor: cursor + limit,
    }
  })

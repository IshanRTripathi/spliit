import { getGroup } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getGroupProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId }, ctx: { userIdentifier } }) => {
    const group = await getGroup(groupId, userIdentifier)
    return { group }
  })

import { joinGroupForUser } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const joinGroupProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .mutation(async ({ input: { groupId }, ctx: { userIdentifier } }) => {
    const group = await joinGroupForUser(groupId, userIdentifier)
    return { groupId: group.id, name: group.name }
  })

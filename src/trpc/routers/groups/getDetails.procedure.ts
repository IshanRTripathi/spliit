import { getGroup, getGroupExpensesParticipants } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getGroupDetailsProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId }, ctx: { userIdentifier } }) => {
    const group = await getGroup(groupId, userIdentifier)
    if (!group) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Group not found.',
      })
    }

    const participantsWithExpenses = await getGroupExpensesParticipants(groupId)
    return { group, participantsWithExpenses }
  })

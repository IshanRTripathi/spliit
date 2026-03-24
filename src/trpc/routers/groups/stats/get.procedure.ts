import { getGroupExpenses } from '@/lib/api'
import {
  getTotalActiveUserPaidFor,
  getTotalActiveUserShare,
  getTotalGroupSpending,
} from '@/lib/totals'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getGroupStatsProcedure = authedProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .query(async ({ input: { groupId, participantId }, ctx: { userIdentifier } }) => {
    const expenses = await getGroupExpenses(groupId, undefined, userIdentifier)
    const totalGroupSpendings = getTotalGroupSpending(expenses)

    const totalParticipantSpendings =
      participantId !== undefined
        ? getTotalActiveUserPaidFor(participantId, expenses)
        : undefined
    const totalParticipantShare =
      participantId !== undefined
        ? getTotalActiveUserShare(participantId, expenses)
        : undefined

    return {
      totalGroupSpendings,
      totalParticipantSpendings,
      totalParticipantShare,
    }
  })

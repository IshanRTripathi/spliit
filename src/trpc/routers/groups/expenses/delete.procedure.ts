import { deleteExpense } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const deleteGroupExpenseProcedure = authedProcedure
  .input(
    z.object({
      expenseId: z.string().min(1),
      groupId: z.string().min(1),
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({
      input: { expenseId, groupId, participantId },
      ctx: { userIdentifier },
    }) => {
      await deleteExpense(groupId, expenseId, userIdentifier, participantId)
    return {}
    },
  )

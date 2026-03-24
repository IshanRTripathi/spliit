import { getExpense } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

export const getGroupExpenseProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1), expenseId: z.string().min(1) }))
  .query(async ({ input: { groupId, expenseId }, ctx: { userIdentifier } }) => {
    const expense = await getExpense(groupId, expenseId, userIdentifier)
    if (!expense) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Expense not found',
      })
    }
    return { expense }
  })

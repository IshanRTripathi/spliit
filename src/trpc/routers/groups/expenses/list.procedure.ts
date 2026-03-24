import { getGroupExpenses } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupExpensesProcedure = authedProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      cursor: z.number().optional(),
      limit: z.number().optional(),
      filter: z.string().optional(),
    }),
  )
  .query(
    async ({
      input: { groupId, cursor = 0, limit = 10, filter },
      ctx: { userIdentifier },
    }) => {
    const expenses = await getGroupExpenses(groupId, {
      offset: cursor,
      length: limit + 1,
      filter,
    }, userIdentifier)
    return {
      expenses: expenses.slice(0, limit).map((expense) => ({
        ...expense,
        createdAt: new Date(expense.createdAt),
        expenseDate: new Date(expense.expenseDate),
      })),
      hasMore: !!expenses[limit],
      nextCursor: cursor + limit,
    }
    },
  )

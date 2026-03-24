import { createExpense } from '@/lib/api'
import { expenseFormSchema } from '@/lib/schemas'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupExpenseProcedure = authedProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      expenseFormValues: expenseFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({
      input: { groupId, expenseFormValues, participantId },
      ctx: { userIdentifier },
    }) => {
      const expense = await createExpense(
        expenseFormValues,
        groupId,
        userIdentifier,
        participantId,
      )
      return { expenseId: expense.id }
    },
  )

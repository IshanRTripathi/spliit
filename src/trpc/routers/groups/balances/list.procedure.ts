import { getGroup, getGroupExpenses } from '@/lib/api'
import {
  getBalances,
  getPublicBalances,
  getSuggestedReimbursements,
} from '@/lib/balances'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const listGroupBalancesProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .query(async ({ input: { groupId }, ctx: { userIdentifier } }) => {
    const expenses = await getGroupExpenses(groupId, undefined, userIdentifier)
    const group = await getGroup(groupId, userIdentifier)
    
    const balances = getBalances(
      expenses,
      group?.currencyCode ?? undefined,
      group?.exchangeRate ? Number(group.exchangeRate) : undefined,
    )
    const reimbursements = getSuggestedReimbursements(balances)
    const publicBalances = getPublicBalances(reimbursements)

    return { balances: publicBalances, reimbursements }
  })

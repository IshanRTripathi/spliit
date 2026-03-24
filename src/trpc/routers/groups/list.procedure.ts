import { getGroupsForUser } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'

export const listGroupsProcedure = authedProcedure.query(
  async ({ ctx: { userIdentifier } }) => {
    const groups = await getGroupsForUser(userIdentifier)
    return { groups }
  },
)

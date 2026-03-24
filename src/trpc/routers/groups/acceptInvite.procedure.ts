import { acceptInviteByToken } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const acceptInviteProcedure = authedProcedure
  .input(z.object({ token: z.string().min(1) }))
  .mutation(async ({ input: { token }, ctx: { userIdentifier } }) => {
    const group = await acceptInviteByToken(token, userIdentifier)
    return { groupId: group.id, groupName: group.name }
  })

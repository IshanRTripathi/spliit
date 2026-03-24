import { createGroupInvite } from '@/lib/api'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupInviteProcedure = authedProcedure
  .input(z.object({ groupId: z.string().min(1) }))
  .mutation(async ({ input: { groupId }, ctx: { userIdentifier } }) => {
    const invite = await createGroupInvite(groupId, userIdentifier)
    return { token: invite.token, expiresAt: invite.expiresAt }
  })

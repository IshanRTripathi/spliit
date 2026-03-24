import { getInviteByToken } from '@/lib/api'
import { baseProcedure } from '@/trpc/init'
import { z } from 'zod'

export const getInviteProcedure = baseProcedure
  .input(z.object({ token: z.string().min(1) }))
  .query(async ({ input: { token } }) => {
    const invite = await getInviteByToken(token)
    return {
      invite: invite
        ? {
            token: invite.token,
            groupId: invite.groupId,
            groupName: invite.groupName,
            expiresAt: invite.expiresAt,
          }
        : null,
    }
  })

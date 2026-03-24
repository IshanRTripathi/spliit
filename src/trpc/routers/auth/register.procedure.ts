import { registerAuthUser } from '@/lib/auth-db'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const authInputSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(8),
})

export const registerProcedure = baseProcedure
  .input(authInputSchema)
  .mutation(async ({ input }) => {
    const result = await registerAuthUser(input.identifier, input.password)
    if (!result.ok && result.code === 'EXISTS') {
      throw new TRPCError({
        code: 'CONFLICT',
        message: 'Account already exists. Try signing in.',
      })
    }
    return { ok: true as const }
  })

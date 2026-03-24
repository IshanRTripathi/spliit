import { verifyAuthUserCredentials } from '@/lib/auth-db'
import { baseProcedure } from '@/trpc/init'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

const authInputSchema = z.object({
  identifier: z.string().trim().min(1),
  password: z.string().min(8),
})

export const signInProcedure = baseProcedure
  .input(authInputSchema)
  .mutation(async ({ input }) => {
    const user = await verifyAuthUserCredentials(
      input.identifier,
      input.password,
    )
    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
      })
    }
    return { identifier: user.identifier }
  })

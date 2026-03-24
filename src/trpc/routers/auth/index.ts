import { createTRPCRouter } from '@/trpc/init'
import { registerProcedure } from './register.procedure'
import { signInProcedure } from './sign-in.procedure'

export const authRouter = createTRPCRouter({
  register: registerProcedure,
  signIn: signInProcedure,
})

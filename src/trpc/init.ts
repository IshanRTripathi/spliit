import { Prisma } from '@prisma/client'
import { initTRPC } from '@trpc/server'
import { TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { AUTH_USER_COOKIE, normalizeAuthIdentifier } from '@/lib/auth'

superjson.registerCustom<Prisma.Decimal, string>(
  {
    isApplicable: (v): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v),
    serialize: (v) => v.toJSON(),
    deserialize: (v) => new Prisma.Decimal(v),
  },
  'decimal.js',
)

const parseCookie = (cookieHeader: string | null, key: string) => {
  if (!cookieHeader) return undefined
  const match = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${key}=`))
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : undefined
}

export const createTRPCContext = async (opts?: { req?: Request }) => {
  /**
   * @see: https://trpc.io/docs/server/context
   */
  const userIdentifier = parseCookie(
    opts?.req?.headers.get('cookie') ?? null,
    AUTH_USER_COOKIE,
  )
  return {
    userIdentifier: userIdentifier
      ? normalizeAuthIdentifier(userIdentifier)
      : undefined,
  }
}

// Avoid exporting the entire t-object
// since it's not very descriptive.
// For instance, the use of a t variable
// is common in i18n libraries.
type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>

const t = initTRPC.context<TRPCContext>().create({
  /**
   * @see https://trpc.io/docs/server/data-transformers
   */
  transformer: superjson,
})

// Base router and procedure helpers
export const createTRPCRouter = t.router
export const baseProcedure = t.procedure
export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userIdentifier) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      userIdentifier: ctx.userIdentifier,
    },
  })
})

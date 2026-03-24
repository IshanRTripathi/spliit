import { createTRPCRouter } from '@/trpc/init'
import { acceptInviteProcedure } from '@/trpc/routers/groups/acceptInvite.procedure'
import { activitiesRouter } from '@/trpc/routers/groups/activities'
import { groupBalancesRouter } from '@/trpc/routers/groups/balances'
import { createGroupProcedure } from '@/trpc/routers/groups/create.procedure'
import { createGroupInviteProcedure } from '@/trpc/routers/groups/createInvite.procedure'
import { groupExpensesRouter } from '@/trpc/routers/groups/expenses'
import { getGroupProcedure } from '@/trpc/routers/groups/get.procedure'
import { getInviteProcedure } from '@/trpc/routers/groups/getInvite.procedure'
import { joinGroupProcedure } from '@/trpc/routers/groups/join.procedure'
import { groupStatsRouter } from '@/trpc/routers/groups/stats'
import { updateGroupProcedure } from '@/trpc/routers/groups/update.procedure'
import { getGroupDetailsProcedure } from './getDetails.procedure'
import { listGroupsProcedure } from './list.procedure'

export const groupsRouter = createTRPCRouter({
  expenses: groupExpensesRouter,
  balances: groupBalancesRouter,
  stats: groupStatsRouter,
  activities: activitiesRouter,

  get: getGroupProcedure,
  getDetails: getGroupDetailsProcedure,
  getInvite: getInviteProcedure,
  list: listGroupsProcedure,
  join: joinGroupProcedure,
  createInvite: createGroupInviteProcedure,
  acceptInvite: acceptInviteProcedure,
  create: createGroupProcedure,
  update: updateGroupProcedure,
})

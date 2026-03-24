import { createGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const createGroupProcedure = authedProcedure
  .input(
    z.object({
      groupFormValues: groupFormSchema,
    }),
  )
  .mutation(async ({ input: { groupFormValues }, ctx: { userIdentifier } }) => {
    const group = await createGroup(groupFormValues, userIdentifier)
    return { groupId: group.id }
  })

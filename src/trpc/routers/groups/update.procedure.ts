import { updateGroup } from '@/lib/api'
import { groupFormSchema } from '@/lib/schemas'
import { authedProcedure } from '@/trpc/init'
import { z } from 'zod'

export const updateGroupProcedure = authedProcedure
  .input(
    z.object({
      groupId: z.string().min(1),
      groupFormValues: groupFormSchema,
      participantId: z.string().optional(),
    }),
  )
  .mutation(
    async ({
      input: { groupId, groupFormValues, participantId },
      ctx: { userIdentifier },
    }) => {
      await updateGroup(groupId, groupFormValues, userIdentifier, participantId)
    },
  )

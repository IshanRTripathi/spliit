import { prisma } from '@/lib/prisma'
import { normalizeAuthIdentifier } from '@/lib/auth'
import { ExpenseFormValues, GroupFormValues } from '@/lib/schemas'
import { TRPCError } from '@trpc/server'
import {
  ActivityType,
  Expense,
  RecurrenceRule,
  RecurringExpenseLink,
} from '@prisma/client'
import { nanoid } from 'nanoid'

export function randomId() {
  return nanoid()
}

function randomInviteToken() {
  return nanoid(24)
}

function identifierToDisplayName(identifier: string) {
  const normalized = normalizeAuthIdentifier(identifier)
  if (normalized.includes('@')) {
    return normalized.split('@')[0].slice(0, 50) || 'Member'
  }
  return normalized.slice(0, 50)
}

async function getOrCreateUserByIdentifier(identifier: string) {
  const normalized = normalizeAuthIdentifier(identifier)
  await prisma.$executeRaw`
    INSERT INTO "AppUser" ("id", "identifier", "createdAt")
    VALUES (${randomId()}, ${normalized}, NOW())
    ON CONFLICT ("identifier") DO NOTHING
  `
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "AppUser" WHERE "identifier" = ${normalized} LIMIT 1
  `
  const user = rows[0]
  if (!user) throw new Error('Failed to resolve auth user')
  return user
}

async function assertGroupAccess(groupId: string, userIdentifier: string) {
  const normalized = normalizeAuthIdentifier(userIdentifier)
  const rows = await prisma.$queryRaw<{ has_access: boolean }[]>`
    SELECT EXISTS (
      SELECT 1
      FROM "GroupMembership" gm
      JOIN "AppUser" u ON u."id" = gm."userId"
      WHERE gm."groupId" = ${groupId}
        AND u."identifier" = ${normalized}
    ) as has_access
  `
  if (!rows[0]?.has_access) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Unauthorized group access',
    })
  }
}

export async function createGroup(
  groupFormValues: GroupFormValues,
  userIdentifier: string,
) {
  const user = await getOrCreateUserByIdentifier(userIdentifier)
  const ownerParticipantName = identifierToDisplayName(userIdentifier)
  return prisma.group.create({
    data: {
      id: randomId(),
      name: groupFormValues.name,
      information: groupFormValues.information,
      currency: groupFormValues.currency,
      currencyCode: groupFormValues.currencyCode,
      destinationCurrencyCode: groupFormValues.destinationCurrencyCode || null,
      exchangeRate: groupFormValues.exchangeRate ?? null,
      participants: {
        createMany: {
          data: [
            {
              id: randomId(),
              name: ownerParticipantName,
            },
            ...groupFormValues.participants.map(({ name }) => ({
              id: randomId(),
              name,
            })),
          ],
        },
      },
    },
    include: { participants: true },
  })
    .then(async (group) => {
      await prisma.$executeRaw`
        UPDATE "Participant"
        SET "userIdentifier" = ${normalizeAuthIdentifier(userIdentifier)}
        WHERE "groupId" = ${group.id}
          AND "name" = ${ownerParticipantName}
          AND "userIdentifier" IS NULL
      `
      await prisma.$executeRaw`
        INSERT INTO "GroupMembership" ("id", "groupId", "userId", "role", "createdAt")
        VALUES (${randomId()}, ${group.id}, ${user.id}, 'OWNER', NOW())
        ON CONFLICT ("groupId", "userId") DO NOTHING
      `
      return group
    })
}

export async function createExpense(
  expenseFormValues: ExpenseFormValues,
  groupId: string,
  userIdentifier: string,
  participantId?: string,
): Promise<Expense> {
  await assertGroupAccess(groupId, userIdentifier)
  const group = await getGroup(groupId, userIdentifier)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  const expenseId = randomId()
  await logActivity(groupId, ActivityType.CREATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  const isCreateRecurrence =
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE
  const recurringExpenseLinkPayload = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  return prisma.expense.create({
    data: {
      id: expenseId,
      groupId,
      expenseDate: expenseFormValues.expenseDate,
      categoryId: expenseFormValues.category,
      amount: expenseFormValues.amount,
      originalAmount: expenseFormValues.originalAmount,
      originalCurrency: expenseFormValues.originalCurrency,
      conversionRate: expenseFormValues.conversionRate,
      title: expenseFormValues.title,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      recurrenceRule: expenseFormValues.recurrenceRule,
      recurringExpenseLink: {
        ...(isCreateRecurrence
          ? {
              create: recurringExpenseLinkPayload,
            }
          : {}),
      },
      paidFor: {
        createMany: {
          data: expenseFormValues.paidFor.map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        },
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        createMany: {
          data: expenseFormValues.documents.map((doc) => ({
            id: randomId(),
            url: doc.url,
            width: doc.width,
            height: doc.height,
          })),
        },
      },
      notes: expenseFormValues.notes,
    },
  })
}

export async function deleteExpense(
  groupId: string,
  expenseId: string,
  userIdentifier: string,
  participantId?: string,
) {
  await assertGroupAccess(groupId, userIdentifier)
  const existingExpense = await getExpense(groupId, expenseId)
  await logActivity(groupId, ActivityType.DELETE_EXPENSE, {
    participantId,
    expenseId,
    data: existingExpense?.title,
  })

  await prisma.expense.delete({
    where: { id: expenseId },
    include: { paidFor: true, paidBy: true },
  })
}

export async function getGroupExpensesParticipants(groupId: string) {
  const expenses = await getGroupExpenses(groupId)
  return Array.from(
    new Set(
      expenses.flatMap((e) => [
        e.paidBy.id,
        ...e.paidFor.map((pf) => pf.participant.id),
      ]),
    ),
  )
}

export async function getGroupsForUser(userIdentifier: string) {
  const normalized = normalizeAuthIdentifier(userIdentifier)
  const groups = await prisma.group.findMany({
    where: {
      id: {
        in: (
          await prisma.$queryRaw<{ groupId: string }[]>`
            SELECT gm."groupId"
            FROM "GroupMembership" gm
            JOIN "AppUser" u ON u."id" = gm."userId"
            WHERE u."identifier" = ${normalized}
          `
        ).map((row) => row.groupId),
      },
    },
    include: { _count: { select: { participants: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return groups.map((group) => ({
    ...group,
    createdAt: group.createdAt.toISOString(),
  }))
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  expenseFormValues: ExpenseFormValues,
  userIdentifier: string,
  participantId?: string,
) {
  await assertGroupAccess(groupId, userIdentifier)
  const group = await getGroup(groupId, userIdentifier)
  if (!group) throw new Error(`Invalid group ID: ${groupId}`)

  const existingExpense = await getExpense(groupId, expenseId)
  if (!existingExpense) throw new Error(`Invalid expense ID: ${expenseId}`)

  for (const participant of [
    expenseFormValues.paidBy,
    ...expenseFormValues.paidFor.map((p) => p.participant),
  ]) {
    if (!group.participants.some((p) => p.id === participant))
      throw new Error(`Invalid participant ID: ${participant}`)
  }

  await logActivity(groupId, ActivityType.UPDATE_EXPENSE, {
    participantId,
    expenseId,
    data: expenseFormValues.title,
  })

  const isDeleteRecurrenceExpenseLink =
    existingExpense.recurrenceRule !== RecurrenceRule.NONE &&
    expenseFormValues.recurrenceRule === RecurrenceRule.NONE &&
    // Delete the existing RecurrenceExpenseLink only if it has not been acted upon yet
    existingExpense.recurringExpenseLink?.nextExpenseCreatedAt === null

  const isUpdateRecurrenceExpenseLink =
    existingExpense.recurrenceRule !== expenseFormValues.recurrenceRule &&
    // Update the exisiting RecurrenceExpenseLink only if it has not been acted upon yet
    existingExpense.recurringExpenseLink?.nextExpenseCreatedAt === null
  const isCreateRecurrenceExpenseLink =
    existingExpense.recurrenceRule === RecurrenceRule.NONE &&
    expenseFormValues.recurrenceRule !== RecurrenceRule.NONE &&
    // Create a new RecurrenceExpenseLink only if one does not already exist for the expense
    existingExpense.recurringExpenseLink === null

  const newRecurringExpenseLink = createPayloadForNewRecurringExpenseLink(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    expenseFormValues.expenseDate,
    groupId,
  )

  const updatedRecurrenceExpenseLinkNextExpenseDate = calculateNextDate(
    expenseFormValues.recurrenceRule as RecurrenceRule,
    existingExpense.expenseDate,
  )

  return prisma.expense.update({
    where: { id: expenseId },
    data: {
      expenseDate: expenseFormValues.expenseDate,
      amount: expenseFormValues.amount,
      originalAmount: expenseFormValues.originalAmount,
      originalCurrency: expenseFormValues.originalCurrency,
      conversionRate: expenseFormValues.conversionRate,
      title: expenseFormValues.title,
      categoryId: expenseFormValues.category,
      paidById: expenseFormValues.paidBy,
      splitMode: expenseFormValues.splitMode,
      recurrenceRule: expenseFormValues.recurrenceRule,
      paidFor: {
        create: expenseFormValues.paidFor
          .filter(
            (p) =>
              !existingExpense.paidFor.some(
                (pp) => pp.participantId === p.participant,
              ),
          )
          .map((paidFor) => ({
            participantId: paidFor.participant,
            shares: paidFor.shares,
          })),
        update: expenseFormValues.paidFor.map((paidFor) => ({
          where: {
            expenseId_participantId: {
              expenseId,
              participantId: paidFor.participant,
            },
          },
          data: {
            shares: paidFor.shares,
          },
        })),
        deleteMany: existingExpense.paidFor.filter(
          (paidFor) =>
            !expenseFormValues.paidFor.some(
              (pf) => pf.participant === paidFor.participantId,
            ),
        ),
      },
      recurringExpenseLink: {
        ...(isCreateRecurrenceExpenseLink
          ? {
              create: newRecurringExpenseLink,
            }
          : {}),
        ...(isUpdateRecurrenceExpenseLink
          ? {
              update: {
                nextExpenseDate: updatedRecurrenceExpenseLinkNextExpenseDate,
              },
            }
          : {}),
        delete: isDeleteRecurrenceExpenseLink,
      },
      isReimbursement: expenseFormValues.isReimbursement,
      documents: {
        connectOrCreate: expenseFormValues.documents.map((doc) => ({
          create: doc,
          where: { id: doc.id },
        })),
        deleteMany: existingExpense.documents
          .filter(
            (existingDoc) =>
              !expenseFormValues.documents.some(
                (doc) => doc.id === existingDoc.id,
              ),
          )
          .map((doc) => ({
            id: doc.id,
          })),
      },
      notes: expenseFormValues.notes,
    },
  })
}

export async function updateGroup(
  groupId: string,
  groupFormValues: GroupFormValues,
  userIdentifier: string,
  participantId?: string,
) {
  await assertGroupAccess(groupId, userIdentifier)
  const existingGroup = await getGroup(groupId, userIdentifier)
  if (!existingGroup) throw new Error('Invalid group ID')

  await logActivity(groupId, ActivityType.UPDATE_GROUP, { participantId })

  return prisma.group.update({
    where: { id: groupId },
    data: {
      name: groupFormValues.name,
      information: groupFormValues.information,
      currency: groupFormValues.currency,
      currencyCode: groupFormValues.currencyCode,
      destinationCurrencyCode: groupFormValues.destinationCurrencyCode || null,
      exchangeRate: groupFormValues.exchangeRate ?? null,
    },
  })
}

export async function getGroup(groupId: string, userIdentifier?: string) {
  if (userIdentifier) await assertGroupAccess(groupId, userIdentifier)
  return prisma.group.findUnique({
    where: { id: groupId },
    include: { participants: true },
  })
}

export async function getCategories() {
  return prisma.category.findMany()
}

export async function getGroupExpenses(
  groupId: string,
  options?: { offset?: number; length?: number; filter?: string },
  userIdentifier?: string,
) {
  if (userIdentifier) await assertGroupAccess(groupId, userIdentifier)
  await createRecurringExpenses()

  return prisma.expense.findMany({
    select: {
      amount: true,
      category: true,
      createdAt: true,
      expenseDate: true,
      id: true,
      isReimbursement: true,
      paidBy: { select: { id: true, name: true } },
      paidFor: {
        select: {
          participant: { select: { id: true, name: true } },
          shares: true,
        },
      },
      splitMode: true,
      recurrenceRule: true,
      title: true,
      _count: { select: { documents: true } },
    },
    where: {
      groupId,
      title: options?.filter
        ? { contains: options.filter, mode: 'insensitive' }
        : undefined,
    },
    orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }],
    skip: options && options.offset,
    take: options && options.length,
  })
}

export async function getGroupExpenseCount(
  groupId: string,
  userIdentifier?: string,
) {
  if (userIdentifier) await assertGroupAccess(groupId, userIdentifier)
  return prisma.expense.count({ where: { groupId } })
}

export async function getExpense(
  groupId: string,
  expenseId: string,
  userIdentifier?: string,
) {
  if (userIdentifier) await assertGroupAccess(groupId, userIdentifier)
  return prisma.expense.findFirst({
    where: { id: expenseId, groupId },
    include: {
      paidBy: true,
      paidFor: true,
      category: true,
      documents: true,
      recurringExpenseLink: true,
    },
  })
}

export async function getActivities(
  groupId: string,
  userIdentifier?: string,
  options?: { offset?: number; length?: number },
) {
  if (userIdentifier) await assertGroupAccess(groupId, userIdentifier)
  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: [{ time: 'desc' }],
    skip: options?.offset,
    take: options?.length,
  })

  const expenseIds = activities
    .map((activity) => activity.expenseId)
    .filter(Boolean)
  const expenses = await prisma.expense.findMany({
    where: {
      groupId,
      id: { in: expenseIds },
    },
  })

  return activities.map((activity) => ({
    ...activity,
    expense:
      activity.expenseId !== null
        ? expenses.find((expense) => expense.id === activity.expenseId)
        : undefined,
  }))
}

export async function joinGroupForUser(groupId: string, userIdentifier: string) {
  const user = await getOrCreateUserByIdentifier(userIdentifier)
  const normalizedIdentifier = normalizeAuthIdentifier(userIdentifier)
  const group = await prisma.group.findUnique({ where: { id: groupId } })
  if (!group) throw new Error('Group not found')
  await prisma.$executeRaw`
    INSERT INTO "GroupMembership" ("id", "groupId", "userId", "role", "createdAt")
    VALUES (${randomId()}, ${groupId}, ${user.id}, 'MEMBER', NOW())
    ON CONFLICT ("groupId", "userId") DO NOTHING
  `
  await prisma.$executeRaw`
    INSERT INTO "Participant" ("id", "name", "groupId", "userIdentifier")
    VALUES (${randomId()}, ${identifierToDisplayName(userIdentifier)}, ${groupId}, ${normalizedIdentifier})
    ON CONFLICT ("groupId", "userIdentifier") DO NOTHING
  `
  return group
}

export async function createGroupInvite(groupId: string, userIdentifier: string) {
  const user = await getOrCreateUserByIdentifier(userIdentifier)
  await assertGroupAccess(groupId, userIdentifier)
  const token = randomInviteToken()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  await prisma.$executeRaw`
    INSERT INTO "GroupInvite" ("id", "token", "groupId", "createdByUserId", "createdAt", "expiresAt")
    VALUES (${randomId()}, ${token}, ${groupId}, ${user.id}, NOW(), ${expiresAt})
  `
  return { token, expiresAt }
}

export async function getInviteByToken(token: string) {
  const invites = await prisma.$queryRaw<
    {
      token: string
      groupId: string
      groupName: string
      expiresAt: Date | null
      revokedAt: Date | null
    }[]
  >`
    SELECT gi."token", gi."groupId", g."name" as "groupName", gi."expiresAt", gi."revokedAt"
    FROM "GroupInvite" gi
    JOIN "Group" g ON g."id" = gi."groupId"
    WHERE gi."token" = ${token}
    LIMIT 1
  `
  const invite = invites[0]
  if (!invite) return null
  if (invite.revokedAt) return null
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return null
  return invite
}

export async function acceptInviteByToken(token: string, userIdentifier: string) {
  const invite = await getInviteByToken(token)
  if (!invite) throw new Error('Invalid or expired invite')
  const group = await joinGroupForUser(invite.groupId, userIdentifier)
  return group
}

export async function logActivity(
  groupId: string,
  activityType: ActivityType,
  extra?: { participantId?: string; expenseId?: string; data?: string },
) {
  return prisma.activity.create({
    data: {
      id: randomId(),
      groupId,
      activityType,
      ...extra,
    },
  })
}

async function createRecurringExpenses() {
  const localDate = new Date() // Current local date
  const utcDateFromLocal = new Date(
    Date.UTC(
      localDate.getUTCFullYear(),
      localDate.getUTCMonth(),
      localDate.getUTCDate(),
      // More precision beyond date is required to ensure that recurring Expenses are created within <most precises unit> of when expected
      localDate.getUTCHours(),
      localDate.getUTCMinutes(),
    ),
  )

  const recurringExpenseLinksWithExpensesToCreate =
    await prisma.recurringExpenseLink.findMany({
      where: {
        nextExpenseCreatedAt: null,
        nextExpenseDate: {
          lte: utcDateFromLocal,
        },
      },
      include: {
        currentFrameExpense: {
          include: {
            paidBy: true,
            paidFor: true,
            category: true,
            documents: true,
          },
        },
      },
    })

  for (const recurringExpenseLink of recurringExpenseLinksWithExpensesToCreate) {
    let newExpenseDate = recurringExpenseLink.nextExpenseDate

    let currentExpenseRecord = recurringExpenseLink.currentFrameExpense
    let currentReccuringExpenseLinkId = recurringExpenseLink.id

    while (newExpenseDate < utcDateFromLocal) {
      const newExpenseId = randomId()
      const newRecurringExpenseLinkId = randomId()

      const newRecurringExpenseNextExpenseDate = calculateNextDate(
        currentExpenseRecord.recurrenceRule as RecurrenceRule,
        newExpenseDate,
      )

      const {
        category,
        paidBy,
        paidFor,
        documents,
        ...destructeredCurrentExpenseRecord
      } = currentExpenseRecord

      // Use a transacton to ensure that the only one expense is created for the RecurringExpenseLink
      // just in case two clients are processing the same RecurringExpenseLink at the same time
      const newExpense = await prisma
        .$transaction(async (transaction) => {
          const newExpense = await transaction.expense.create({
            data: {
              ...destructeredCurrentExpenseRecord,
              categoryId: currentExpenseRecord.categoryId,
              paidById: currentExpenseRecord.paidById,
              paidFor: {
                createMany: {
                  data: currentExpenseRecord.paidFor.map((paidFor) => ({
                    participantId: paidFor.participantId,
                    shares: paidFor.shares,
                  })),
                },
              },
              documents: {
                connect: currentExpenseRecord.documents.map(
                  (documentRecord) => ({
                    id: documentRecord.id,
                  }),
                ),
              },
              id: newExpenseId,
              expenseDate: newExpenseDate,
              recurringExpenseLink: {
                create: {
                  groupId: currentExpenseRecord.groupId,
                  id: newRecurringExpenseLinkId,
                  nextExpenseDate: newRecurringExpenseNextExpenseDate,
                },
              },
            },
            // Ensure that the same information is available on the returned record that was created
            include: {
              paidFor: true,
              documents: true,
              category: true,
              paidBy: true,
            },
          })

          // Mark the RecurringExpenseLink as being "completed" since the new Expense was created
          // if an expense hasn't been created for this RecurringExpenseLink yet
          await transaction.recurringExpenseLink.update({
            where: {
              id: currentReccuringExpenseLinkId,
              nextExpenseCreatedAt: null,
            },
            data: {
              nextExpenseCreatedAt: newExpense.createdAt,
            },
          })

          return newExpense
        })
        .catch(() => {
          console.error(
            'Failed to created recurringExpense for expenseId: %s',
            currentExpenseRecord.id,
          )
          return null
        })

      // If the new expense failed to be created, break out of the while-loop
      if (newExpense === null) break

      // Set the values for the next iteration of the for-loop in case multiple recurring Expenses need to be created
      currentExpenseRecord = newExpense
      currentReccuringExpenseLinkId = newRecurringExpenseLinkId
      newExpenseDate = newRecurringExpenseNextExpenseDate
    }
  }
}

function createPayloadForNewRecurringExpenseLink(
  recurrenceRule: RecurrenceRule,
  priorDateToNextRecurrence: Date,
  groupId: String,
): RecurringExpenseLink {
  const nextExpenseDate = calculateNextDate(
    recurrenceRule,
    priorDateToNextRecurrence,
  )

  const recurringExpenseLinkId = randomId()
  const recurringExpenseLinkPayload = {
    id: recurringExpenseLinkId,
    groupId: groupId,
    nextExpenseDate: nextExpenseDate,
  }

  return recurringExpenseLinkPayload as RecurringExpenseLink
}

// TODO: Modify this function to use a more comprehensive recurrence Rule library like rrule (https://github.com/jkbrzt/rrule)
//
// Current limitations:
// - If a date is intended to be repeated monthly on the 29th, 30th or 31st, it will change to repeating on the smallest
// date that the reccurence has encountered. Ex. If a recurrence is created for Jan 31st on 2025, the recurring expense
// will be created for Feb 28th, March 28, etc. until it is cancelled or fixed
function calculateNextDate(
  recurrenceRule: RecurrenceRule,
  priorDateToNextRecurrence: Date,
): Date {
  const nextDate = new Date(priorDateToNextRecurrence)
  switch (recurrenceRule) {
    case RecurrenceRule.DAILY:
      nextDate.setUTCDate(nextDate.getUTCDate() + 1)
      break
    case RecurrenceRule.WEEKLY:
      nextDate.setUTCDate(nextDate.getUTCDate() + 7)
      break
    case RecurrenceRule.MONTHLY:
      const nextYear = nextDate.getUTCFullYear()
      const nextMonth = nextDate.getUTCMonth() + 1
      let nextDay = nextDate.getUTCDate()

      // Reduce the next day until it is within the direct next month
      while (!isDateInNextMonth(nextYear, nextMonth, nextDay)) {
        nextDay -= 1
      }
      nextDate.setUTCMonth(nextMonth, nextDay)
      break
  }

  return nextDate
}

function isDateInNextMonth(
  utcYear: number,
  utcMonth: number,
  utcDate: number,
): Boolean {
  const testDate = new Date(Date.UTC(utcYear, utcMonth, utcDate))

  // We're not concerned if the year or month changes. We only want to make sure that the date is our target date
  if (testDate.getUTCDate() !== utcDate) {
    return false
  }

  return true
}

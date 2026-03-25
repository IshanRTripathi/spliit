'use client'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { trpc } from '@/trpc/client'
import { CreateFromReceiptButtonInner } from './create-from-receipt-button'
import { useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { ExpenseForm } from './expense-form'

export function CreateExpenseForm({
  groupId,
  runtimeFeatureFlags,
}: {
  groupId: string
  expenseId?: string
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const { data: groupData } = trpc.groups.get.useQuery({ groupId })
  const group = groupData?.group

  const { data: categoriesData } = trpc.categories.list.useQuery()
  const categories = categoriesData?.categories

  const { mutateAsync: createExpenseMutateAsync } =
    trpc.groups.expenses.create.useMutation()

  const utils = trpc.useUtils()
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoOpenScan = searchParams.get('openScan') === '1'

  if (!group || !categories) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    )
  }

  return (
    <>
      {runtimeFeatureFlags.enableReceiptExtract && autoOpenScan ? (
        <div className="mb-3 flex justify-end">
          <CreateFromReceiptButtonInner compact={false} autoOpen={autoOpenScan} />
        </div>
      ) : null}
      <ExpenseForm
        group={group}
        categories={categories}
        onSubmit={async (expenseFormValues, participantId) => {
          await createExpenseMutateAsync({
            groupId,
            expenseFormValues,
            participantId,
          })
          utils.groups.expenses.invalidate()
          router.push(`/groups/${group.id}`)
        }}
        runtimeFeatureFlags={runtimeFeatureFlags}
      />
    </>
  )
}

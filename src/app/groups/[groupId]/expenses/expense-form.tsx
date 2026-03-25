import { ExpenseDocumentsInput } from '@/components/expense-documents-input'
import { SubmitButton } from '@/components/submit-button'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Locale } from '@/i18n/request'
import { randomId } from '@/lib/api'
import { getCurrency } from '@/lib/currency'
import { RuntimeFeatureFlags } from '@/lib/featureFlags'
import { useActiveUser } from '@/lib/hooks'
import {
  ExpenseFormValues,
  SplittingOptions,
  expenseFormSchema,
} from '@/lib/schemas'
import { calculateShare } from '@/lib/totals'
import {
  amountAsDecimal,
  amountAsMinorUnits,
  cn,
  formatCurrency,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { zodResolver } from '@hookform/resolvers/zod'
import { RecurrenceRule } from '@prisma/client'
import { CategoryIcon } from './category-icon'
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  MoreVertical,
  Save,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { match } from 'ts-pattern'
import { DeletePopup } from '../../../../components/delete-popup'
import { extractCategoryFromTitle } from '../../../../components/expense-form-actions'
import { Textarea } from '../../../../components/ui/textarea'

const enforceCurrencyPattern = (value: string) =>
  value
    .replace(/^\s*-/, '_') // replace leading minus with _
    .replace(/[.,]/, '#') // replace first comma with #
    .replace(/[-.,]/g, '') // remove other minus and commas characters
    .replace(/_/, '-') // change back _ to minus
    .replace(/#/, '.') // change back # to dot
    .replace(/[^-\d.]/g, '') // remove all non-numeric characters

const getDefaultSplittingOptions = (
  group: NonNullable<AppRouterOutput['groups']['get']['group']>,
) => {
  const defaultValue = {
    splitMode: 'EVENLY' as const,
    paidFor: group.participants.map(({ id }) => ({
      participant: id,
      shares: '1' as any, // Use string to ensure consistent schema handling
    })),
  }

  if (typeof localStorage === 'undefined') return defaultValue
  const defaultSplitMode = localStorage.getItem(
    `${group.id}-defaultSplittingOptions`,
  )
  if (defaultSplitMode === null) return defaultValue
  const parsedDefaultSplitMode = JSON.parse(
    defaultSplitMode,
  ) as SplittingOptions

  if (parsedDefaultSplitMode.paidFor === null) {
    parsedDefaultSplitMode.paidFor = defaultValue.paidFor
  }

  // if there is a participant in the default options that does not exist anymore,
  // remove the stale default splitting options
  for (const parsedPaidFor of parsedDefaultSplitMode.paidFor) {
    if (
      !group.participants.some(({ id }) => id === parsedPaidFor.participant)
    ) {
      localStorage.removeItem(`${group.id}-defaultSplittingOptions`)
      return defaultValue
    }
  }

  return {
    splitMode: parsedDefaultSplitMode.splitMode,
    paidFor: parsedDefaultSplitMode.paidFor.map((paidFor) => ({
      participant: paidFor.participant,
      shares: (paidFor.shares / 100).toString() as any, // Convert to string for consistent schema handling
    })),
  }
}

async function persistDefaultSplittingOptions(
  groupId: string,
  expenseFormValues: ExpenseFormValues,
) {
  if (localStorage && expenseFormValues.saveDefaultSplittingOptions) {
    const computePaidFor = (): SplittingOptions['paidFor'] => {
      if (expenseFormValues.splitMode === 'EVENLY') {
        return expenseFormValues.paidFor.map(({ participant }) => ({
          participant,
          shares: 100,
        }))
      } else if (expenseFormValues.splitMode === 'BY_AMOUNT') {
        return null
      } else {
        return expenseFormValues.paidFor
      }
    }

    const splittingOptions = {
      splitMode: expenseFormValues.splitMode,
      paidFor: computePaidFor(),
    } satisfies SplittingOptions

    localStorage.setItem(
      `${groupId}-defaultSplittingOptions`,
      JSON.stringify(splittingOptions),
    )
  }
}

export function ExpenseForm({
  group,
  categories,
  expense,
  onSubmit,
  onDelete,
  runtimeFeatureFlags,
}: {
  group: NonNullable<AppRouterOutput['groups']['get']['group']>
  categories: AppRouterOutput['categories']['list']['categories']
  expense?: AppRouterOutput['groups']['expenses']['get']['expense']
  onSubmit: (value: ExpenseFormValues, participantId?: string) => Promise<void>
  onDelete?: (participantId?: string) => Promise<void>
  runtimeFeatureFlags: RuntimeFeatureFlags
}) {
  const t = useTranslations('ExpenseForm')
  const tCategories = useTranslations('Categories')
  const locale = useLocale() as Locale
  const isCreate = expense === undefined
  const searchParams = useSearchParams()

  const getSelectedPayer = (field?: { value: string }) => {
    if (isCreate && typeof window !== 'undefined') {
      const activeUser = localStorage.getItem(`${group.id}-activeUser`)
      if (activeUser && activeUser !== 'None' && field?.value === undefined) {
        return activeUser
      }
    }
    return field?.value
  }

  const defaultSplittingOptions = getDefaultSplittingOptions(group)
  const groupCurrency = getCurrencyFromGroup(group)
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          title: expense.title,
          expenseDate: expense.expenseDate ?? new Date(),
          amount: amountAsDecimal(expense.amount, groupCurrency),
          originalCurrency: expense.originalCurrency ?? group.currencyCode,
          originalAmount: expense.originalAmount ?? undefined,
          conversionRate: expense.conversionRate?.toNumber(),
          category: expense.categoryId,
          paidBy: expense.paidById,
          paidFor: expense.paidFor.map(({ participantId, shares }) => ({
            participant: participantId,
            shares: (expense.splitMode === 'BY_AMOUNT'
              ? amountAsDecimal(shares, groupCurrency)
              : (shares / 100).toString()) as any, // Convert to string to ensure consistent handling
          })),
          splitMode: expense.splitMode,
          saveDefaultSplittingOptions: false,
          isReimbursement: expense.isReimbursement,
          documents: expense.documents,
          notes: expense.notes ?? '',
          recurrenceRule: expense.recurrenceRule ?? undefined,
        }
      : searchParams.get('reimbursement')
      ? {
          title: t('reimbursement'),
          expenseDate: new Date(),
          amount: amountAsDecimal(
            Number(searchParams.get('amount')) || 0,
            groupCurrency,
          ),
          originalCurrency: group.currencyCode,
          originalAmount: undefined,
          conversionRate: undefined,
          category: 1, // category with Id 1 is Payment
          paidBy: searchParams.get('from') ?? undefined,
          paidFor: [
            searchParams.get('to')
              ? {
                  participant: searchParams.get('to')!,
                  shares: '1' as any, // String for consistent form handling
                }
              : undefined,
          ],
          isReimbursement: true,
          splitMode: defaultSplittingOptions.splitMode,
          saveDefaultSplittingOptions: false,
          documents: [],
          notes: '',
          recurrenceRule: RecurrenceRule.NONE,
        }
      : {
          title: searchParams.get('title') ?? '',
          expenseDate: searchParams.get('date')
            ? new Date(searchParams.get('date') as string)
            : new Date(),
          amount: Number(searchParams.get('amount')) || 0,
          originalCurrency: group.currencyCode ?? undefined,
          originalAmount: undefined,
          conversionRate: undefined,
          category: searchParams.get('categoryId')
            ? Number(searchParams.get('categoryId'))
            : 0, // category with Id 0 is General
          // paid for all, split evenly
          paidFor: defaultSplittingOptions.paidFor,
          paidBy: getSelectedPayer(),
          isReimbursement: false,
          splitMode: defaultSplittingOptions.splitMode,
          saveDefaultSplittingOptions: false,
          documents: searchParams.get('imageUrl')
            ? [
                {
                  id: randomId(),
                  url: searchParams.get('imageUrl') as string,
                  width: Number(searchParams.get('imageWidth')),
                  height: Number(searchParams.get('imageHeight')),
                },
              ]
            : [],
          notes: '',
          recurrenceRule: RecurrenceRule.NONE,
        },
  })
  const [isCategoryLoading, setCategoryLoading] = useState(false)
  const activeUserId = useActiveUser(group.id)
  const destinationCurrencyCode = group.destinationCurrencyCode ?? ''
  const groupExchangeRate =
    group.exchangeRate && Number(group.exchangeRate) > 0
      ? Number(group.exchangeRate)
      : null
  const hasDestinationToggle =
    !!group.currencyCode &&
    !!destinationCurrencyCode &&
    group.currencyCode !== destinationCurrencyCode &&
    groupExchangeRate !== null
  const [currencyView, setCurrencyView] = useState<'BASE' | 'DEST'>('BASE')

  const submit = async (values: ExpenseFormValues) => {
    await persistDefaultSplittingOptions(group.id, values)

    // Store monetary amounts in minor units (cents)
    values.amount = amountAsMinorUnits(values.amount, groupCurrency)
    values.paidFor = values.paidFor.map(({ participant, shares }) => ({
      participant,
      shares:
        values.splitMode === 'BY_AMOUNT'
          ? amountAsMinorUnits(shares, groupCurrency)
          : shares,
    }))

    // Exchange rate is configured at group level, not per expense.
    delete values.originalAmount
    delete values.originalCurrency
    delete values.conversionRate
    values.recurrenceRule = RecurrenceRule.NONE
    return onSubmit(values, activeUserId ?? undefined)
  }

  const [isIncome, setIsIncome] = useState(Number(form.getValues().amount) < 0)
  const [isEqualSplit, setIsEqualSplit] = useState(
    form.getValues().splitMode === 'EVENLY',
  )
  const [manuallyEditedParticipants, setManuallyEditedParticipants] = useState<
    Set<string>
  >(new Set())

  const sExpense = isIncome ? 'Income' : 'Expense'
  const destinationCurrency = getCurrency(destinationCurrencyCode, locale, '')
  const amountInBase = Number(form.watch('amount') || 0)
  const amountInDestination =
    hasDestinationToggle && groupExchangeRate
      ? amountInBase * groupExchangeRate
      : amountInBase

  const conversionRateMessage = 'Configured in group settings'

  useEffect(() => {
    setManuallyEditedParticipants(new Set())
  }, [form.watch('splitMode'), form.watch('amount')])

  useEffect(() => {
    if (isEqualSplit) {
      form.setValue('splitMode', 'EVENLY', { shouldValidate: true })
      form.setValue(
        'paidFor',
        group.participants.map((p) => ({ participant: p.id, shares: '1' as any })),
        { shouldValidate: true },
      )
    }
  }, [isEqualSplit, group.participants, form])

  useEffect(() => {
    const splitMode = form.getValues().splitMode

    // Only auto-balance for split mode 'Unevenly - By amount'
    if (
      splitMode === 'BY_AMOUNT' &&
      (form.getFieldState('paidFor').isDirty ||
        form.getFieldState('amount').isDirty)
    ) {
      const totalAmount = Number(form.getValues().amount) || 0
      const paidFor = form.getValues().paidFor
      let newPaidFor = [...paidFor]

      const editedParticipants = Array.from(manuallyEditedParticipants)
      let remainingAmount = totalAmount
      let remainingParticipants = newPaidFor.length - editedParticipants.length

      newPaidFor = newPaidFor.map((participant) => {
        if (editedParticipants.includes(participant.participant)) {
          const participantShare = Number(participant.shares) || 0
          if (splitMode === 'BY_AMOUNT') {
            remainingAmount -= participantShare
          }
          return participant
        }
        return participant
      })

      if (remainingParticipants > 0) {
        let amountPerRemaining = 0
        if (splitMode === 'BY_AMOUNT') {
          amountPerRemaining = remainingAmount / remainingParticipants
        }

        newPaidFor = newPaidFor.map((participant) => {
          if (!editedParticipants.includes(participant.participant)) {
            return {
              ...participant,
              shares: amountPerRemaining.toFixed(
                groupCurrency.decimal_digits,
              ) as any, // Keep as string for consistent schema handling
            }
          }
          return participant
        })
      }
      form.setValue('paidFor', newPaidFor, { shouldValidate: true })
    }
  }, [
    manuallyEditedParticipants,
    form.watch('amount'),
    form.watch('splitMode'),
  ])


  const featuredCategories = useMemo(() => {
    const wanted = [
      ['Food and Drink', 'Dining Out'],
      ['Transportation', 'Plane'],
      ['Transportation', 'Hotel'],
      ['Transportation', 'Bus/Train'],
      ['Entertainment', 'Entertainment'],
      ['Uncategorized', 'General'],
    ]
    const picked = wanted
      .map(([grouping, name]) =>
        categories.find((c) => c.grouping === grouping && c.name === name),
      )
      .filter(Boolean) as typeof categories
    if (picked.length >= 6) return picked.slice(0, 6)
    const remaining = categories.filter(
      (c) => !picked.some((pickedCategory) => pickedCategory.id === c.id),
    )
    return [...picked, ...remaining].slice(0, 6)
  }, [categories])

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(submit)}
        className="mx-auto min-h-screen max-w-2xl space-y-4 bg-[#ECECEE] py-4 text-[#212121]"
      >
        <div className="flex h-14 items-center justify-between px-5">
            <Link href={`/groups/${group.id}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-[17px] font-semibold">Add Expense</h1>
            <button type="button" className="cursor-default">
              <MoreVertical className="h-5 w-5" />
            </button>
        </div>
        <div className="space-y-5 px-5 pb-6">
        <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/90 shadow-sm">
          <CardHeader>
            <CardTitle>
              {t(`${sExpense}.${isCreate ? 'create' : 'edit'}`)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <FormField
                control={form.control}
                name="amount"
                render={({ field: { onChange, ...field } }) => (
                  <FormItem className="sm:order-5">
                    <FormLabel className="mb-1 text-[11px] uppercase tracking-wide text-[#8E8E93]">
                      TOTAL AMOUNT
                    </FormLabel>
                    <div className="flex items-center justify-between">
                      <div className="flex items-end gap-1">
                      <span className="text-2xl font-semibold text-[#D81B60]">
                        {currencyView === 'DEST' && hasDestinationToggle
                          ? destinationCurrency.symbol || destinationCurrencyCode
                          : group.currency}
                      </span>
                      <FormControl>
                        <Input
                          className="max-w-[200px] border-0 bg-transparent p-0 text-[36px] font-bold tracking-tight shadow-none focus-visible:ring-0"
                          type="text"
                          inputMode="decimal"
                          placeholder="0.00"
                          onChange={(event) => {
                            const v = enforceCurrencyPattern(event.target.value)
                            const enteredAmount = Number(v)
                            const baseAmount =
                              currencyView === 'DEST' &&
                              hasDestinationToggle &&
                              groupExchangeRate
                                ? enteredAmount / groupExchangeRate
                                : enteredAmount
                            const income = Number(baseAmount) < 0
                            setIsIncome(income)
                            if (income) form.setValue('isReimbursement', false)
                            onChange(baseAmount)
                          }}
                          onFocus={(e) => {
                            const target = e.currentTarget
                            setTimeout(() => target.select(), 1)
                          }}
                          value={
                            currencyView === 'DEST' &&
                            hasDestinationToggle &&
                            groupExchangeRate
                              ? enforceCurrencyPattern(
                                  String(amountInDestination.toFixed(groupCurrency.decimal_digits)),
                                )
                              : field.value
                          }
                        />
                      </FormControl>
                      </div>
                      {hasDestinationToggle ? (
                        <div className="flex rounded-full bg-[#E9E9EB] p-[3px]">
                          <button
                            type="button"
                            onClick={() => setCurrencyView('BASE')}
                            className={cn(
                              'px-3 py-[5px] text-xs rounded-full',
                              currencyView === 'BASE'
                                ? 'bg-white text-[#D81B60] shadow-sm'
                                : 'text-[#8E8E93]',
                            )}
                          >
                            {group.currencyCode}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCurrencyView('DEST')}
                            className={cn(
                              'px-3 py-[5px] text-xs rounded-full',
                              currencyView === 'DEST'
                                ? 'bg-white text-[#D81B60] shadow-sm'
                                : 'text-[#8E8E93]',
                            )}
                          >
                            {destinationCurrencyCode}
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-full bg-white px-3 py-[5px] text-xs text-[#8E8E93] shadow-sm">
                          {group.currencyCode ?? group.currency}
                        </div>
                      )}
                    </div>
                    {!isIncome && (
                      <FormField
                        control={form.control}
                        name="isReimbursement"
                        render={({ field }) => (
                          <FormItem className="flex flex-row gap-2 items-center space-y-0 pt-2">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div>
                              <FormLabel>
                                {t('isReimbursementField.label')}
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem className="hidden">
                  <FormControl>
                    <Input
                      {...field}
                      onBlur={async () => {
                        field.onBlur()
                        if (runtimeFeatureFlags.enableCategoryExtract) {
                          setCategoryLoading(true)
                          const { categoryId } = await extractCategoryFromTitle(
                            field.value,
                          )
                          form.setValue('category', categoryId)
                          setCategoryLoading(false)
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="expenseDate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[14px]">{t(`${sExpense}.DateField.label`)}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-12 w-full rounded-[20px] border-0 bg-white px-4 text-[14px] shadow-[0_2px_6px_rgba(0,0,0,0.04)]"
                        defaultValue={formatDate(field.value)}
                        onChange={(event) => {
                          return field.onChange(new Date(event.target.value))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paidBy"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-[14px]">{t(`${sExpense}.paidByField.label`)}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={getSelectedPayer(field)}
                    >
                      <SelectTrigger className="h-12 w-full rounded-[20px] border-0 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
                        <SelectValue
                          placeholder={t(`${sExpense}.paidByField.placeholder`)}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {group.participants.map(({ id, name }) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <p className="text-xs text-[#8E8E93]">{conversionRateMessage}</p>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="order-3 sm:order-2">
                  <FormLabel className="text-[14px]">{t('categoryField.label')}</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {featuredCategories.map((category) => {
                      const isSelected = form.watch(field.name) === category.id
                      return (
                        <Button
                          key={category.id}
                          type="button"
                          onClick={() => field.onChange(category.id)}
                          className={cn(
                            'h-[88px] rounded-[20px] flex-col gap-1 text-[12px]',
                            isSelected
                              ? 'bg-magenta-gradient text-white shadow-[0_10px_20px_rgba(216,27,96,0.25)]'
                              : 'bg-white text-[#6E6E73] shadow-[0_2px_6px_rgba(0,0,0,0.04)]',
                          )}
                        >
                          <CategoryIcon category={category} className="h-5 w-5" />
                          <span className="line-clamp-1">
                            {tCategories(`${category.grouping}.${category.name}`)}
                          </span>
                        </Button>
                      )
                    })}
                  </div>
                  {isCategoryLoading ? (
                    <FormDescription>{t('conversionRateState.loading')}</FormDescription>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:order-6">
                  <FormLabel className="text-[14px]">{t('notesField.label')}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="h-24 w-full rounded-[20px] border-0 bg-white p-4 text-[13px] placeholder:text-[#C7C7CC]"
                      placeholder="Add transaction details, tags, or reminders..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card className="mt-4 overflow-hidden rounded-[22px] border-0 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="flex justify-between text-[14px]">
              <span>Split with...</span>
              <Button
                variant="link"
                type="button"
                className="-my-2 -mx-4"
                onClick={() => {
                  const paidFor = form.getValues().paidFor
                  const allSelected =
                    paidFor.length === group.participants.length
                  const newPaidFor = allSelected
                    ? []
                    : group.participants.map((p) => ({
                        participant: p.id,
                        shares: (paidFor.find(
                          (pfor) => pfor.participant === p.id,
                        )?.shares ?? '1') as any, // Use string to ensure consistent schema handling
                      }))
                  form.setValue('paidFor', newPaidFor as any, {
                    shouldDirty: true,
                    shouldTouch: true,
                    shouldValidate: true,
                  })
                }}
              >
                {form.getValues().paidFor.length ===
                group.participants.length ? (
                  <>{t('selectNone')}</>
                ) : (
                  <>{t('selectAll')}</>
                )}
              </Button>
            </CardTitle>
            <CardDescription className="hidden">{t(`${sExpense}.paidFor.description`)}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 rounded-[20px] bg-[#F3F4F6] p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {group.participants.slice(0, 3).map((p) => (
                    <div
                      key={p.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-[11px] font-semibold text-foreground ring-2 ring-white"
                    >
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                  ))}
                  {group.participants.length > 3 ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E5E7EB] text-xs ring-2 ring-white">
                      +{group.participants.length - 3}
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[14px]">Equal Split</span>
                <button
                  type="button"
                  onClick={() => setIsEqualSplit((prev) => !prev)}
                  className={cn(
                    'flex h-6 w-10 items-center rounded-full px-1 transition-colors',
                    isEqualSplit ? 'bg-[#F8BBD0]' : 'bg-[#D1D5DB]',
                  )}
                >
                  <span
                    className={cn(
                      'h-4 w-4 rounded-full transition-transform',
                      isEqualSplit
                        ? 'ml-auto bg-[#D81B60]'
                        : 'mr-auto bg-[#6B7280]',
                    )}
                  />
                </button>
              </div>
              <p className="text-[12px] text-[#8E8E93]">
                Each person will owe{' '}
                <span className="text-[#C62828]">
                  {formatCurrency(
                    groupCurrency,
                    amountAsMinorUnits(
                      (Number(form.watch('amount')) || 0) /
                        Math.max(form.watch('paidFor').length || 1, 1),
                      groupCurrency,
                    ),
                    locale,
                  )}
                </span>
              </p>
            </div>
            <FormField
              control={form.control}
              name="paidFor"
              render={() => (
                <FormItem className={cn('sm:order-4 row-span-2 space-y-0', isEqualSplit && 'hidden')}>
                  {group.participants.map(({ id, name }) => (
                    <FormField
                      key={id}
                      control={form.control}
                      name="paidFor"
                      render={({ field }) => {
                        return (
                          <div
                            data-id={`${id}/${form.getValues().splitMode}/${
                              group.currency
                            }`}
                            className="flex flex-wrap gap-y-4 items-center border-t last-of-type:border-b last-of-type:!mb-4 -mx-6 px-6 py-3"
                          >
                            <FormItem className="flex-1 flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.some(
                                    ({ participant }) => participant === id,
                                  )}
                                  onCheckedChange={(checked) => {
                                    const options = {
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true,
                                    }
                                    checked
                                      ? form.setValue(
                                          'paidFor',
                                          [
                                            ...field.value,
                                            {
                                              participant: id,
                                              shares: '1', // Use string to ensure consistent schema handling
                                            },
                                          ] as any,
                                          options,
                                        )
                                      : form.setValue(
                                          'paidFor',
                                          field.value?.filter(
                                            (value) => value.participant !== id,
                                          ),
                                          options,
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal flex-1">
                                {name}
                                {field.value?.some(
                                  ({ participant }) => participant === id,
                                ) &&
                                  !form.watch('isReimbursement') && (
                                    <span className="text-muted-foreground ml-2">
                                      (
                                      {formatCurrency(
                                        groupCurrency,
                                        calculateShare(id, {
                                          amount: amountAsMinorUnits(
                                            Number(form.watch('amount')),
                                            groupCurrency,
                                          ), // Convert to cents
                                          paidFor: field.value.map(
                                            ({ participant, shares }) => ({
                                              participant: {
                                                id: participant,
                                                name: '',
                                                groupId: '',
                                              },
                                              shares:
                                                form.watch('splitMode') ===
                                                'BY_PERCENTAGE'
                                                  ? Number(shares) * 100 // Convert percentage to basis points (e.g., 50% -> 5000)
                                                  : form.watch('splitMode') ===
                                                    'BY_AMOUNT'
                                                  ? amountAsMinorUnits(
                                                      shares,
                                                      groupCurrency,
                                                    )
                                                  : shares,
                                              expenseId: '',
                                              participantId: '',
                                            }),
                                          ),
                                          splitMode: form.watch('splitMode'),
                                          isReimbursement:
                                            form.watch('isReimbursement'),
                                        }),
                                        locale,
                                      )}
                                      )
                                    </span>
                                  )}
                              </FormLabel>
                            </FormItem>
                            <div className="flex">
                              {form.getValues().splitMode !== 'EVENLY' && (
                                <FormField
                                  name={`paidFor[${field.value.findIndex(
                                    ({ participant }) => participant === id,
                                  )}].shares`}
                                  render={() => {
                                    const sharesLabel = (
                                      <span
                                        className={cn('text-sm', {
                                          'text-muted': !field.value?.some(
                                            ({ participant }) =>
                                              participant === id,
                                          ),
                                        })}
                                      >
                                        {match(form.getValues().splitMode)
                                          .with('BY_SHARES', () => (
                                            <>{t('shares')}</>
                                          ))
                                          .with('BY_PERCENTAGE', () => <>%</>)
                                          .with('BY_AMOUNT', () => (
                                            <>{group.currency}</>
                                          ))
                                          .otherwise(() => (
                                            <></>
                                          ))}
                                      </span>
                                    )
                                    return (
                                      <div>
                                        <div className="flex gap-1 items-center">
                                          {form.getValues().splitMode ===
                                            'BY_AMOUNT' && sharesLabel}
                                          <FormControl>
                                            <Input
                                              key={String(
                                                !field.value?.some(
                                                  ({ participant }) =>
                                                    participant === id,
                                                ),
                                              )}
                                              className="text-base w-[80px] -my-2"
                                              type="text"
                                              disabled={
                                                !field.value?.some(
                                                  ({ participant }) =>
                                                    participant === id,
                                                )
                                              }
                                              value={
                                                field.value?.find(
                                                  ({ participant }) =>
                                                    participant === id,
                                                )?.shares
                                              }
                                              onChange={(event) => {
                                                field.onChange(
                                                  field.value.map((p) =>
                                                    p.participant === id
                                                      ? {
                                                          participant: id,
                                                          shares:
                                                            enforceCurrencyPattern(
                                                              event.target
                                                                .value,
                                                            ),
                                                        }
                                                      : p,
                                                  ),
                                                )
                                                setManuallyEditedParticipants(
                                                  (prev) =>
                                                    new Set(prev).add(id),
                                                )
                                              }}
                                              inputMode={
                                                form.getValues().splitMode ===
                                                'BY_AMOUNT'
                                                  ? 'decimal'
                                                  : 'numeric'
                                              }
                                              step={
                                                form.getValues().splitMode ===
                                                'BY_AMOUNT'
                                                  ? 10 **
                                                    -groupCurrency.decimal_digits
                                                  : 1
                                              }
                                            />
                                          </FormControl>
                                          {[
                                            'BY_SHARES',
                                            'BY_PERCENTAGE',
                                          ].includes(
                                            form.getValues().splitMode,
                                          ) && sharesLabel}
                                        </div>
                                        <FormMessage className="float-right" />
                                      </div>
                                    )
                                  }}
                                />
                              )}
                            </div>
                          </div>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEqualSplit ? (
              <Collapsible
                className="mt-5"
                defaultOpen={form.getValues().splitMode !== 'EVENLY'}
              >
                <CollapsibleTrigger asChild>
                  <Button variant="link" className="-mx-4">
                    {t('advancedOptions')}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid sm:grid-cols-2 gap-6 pt-3">
                  <FormField
                    control={form.control}
                    name="splitMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('SplitModeField.label')}</FormLabel>
                        <FormControl>
                          <Select
                            onValueChange={(value) => {
                              form.setValue('splitMode', value as any, {
                                shouldDirty: true,
                                shouldTouch: true,
                                shouldValidate: true,
                              })
                            }}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="EVENLY">
                                {t('SplitModeField.evenly')}
                              </SelectItem>
                              <SelectItem value="BY_SHARES">
                                {t('SplitModeField.byShares')}
                              </SelectItem>
                              <SelectItem value="BY_PERCENTAGE">
                                {t('SplitModeField.byPercentage')}
                              </SelectItem>
                              <SelectItem value="BY_AMOUNT">
                                {t('SplitModeField.byAmount')}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          {t(`${sExpense}.splitModeDescription`)}
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="saveDefaultSplittingOptions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row gap-2 items-center space-y-0 pt-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div>
                          <FormLabel>
                            {t('SplitModeField.saveAsDefault')}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : null}
          </CardContent>
        </Card>

        <Card className="mt-4 rounded-[22px] border-0 bg-white shadow-[0_2px_6px_rgba(0,0,0,0.04)]">
          <CardHeader>
            <CardTitle className="text-[14px]">Receipt</CardTitle>
            <CardDescription className="hidden">{t(`${sExpense}.attachDescription`)}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="documents"
              render={({ field }) => (
                <ExpenseDocumentsInput
                  groupId={group.id}
                  documents={field.value}
                  updateDocuments={field.onChange}
                />
              )}
            />
          </CardContent>
        </Card>

        <div className="sticky bottom-3 z-30 mt-4 rounded-2xl bg-transparent p-0 sm:static">
          <div className="flex gap-2">
          <SubmitButton
            loadingContent={t(isCreate ? 'creating' : 'saving')}
            className="h-[54px] w-full rounded-[24px] bg-magenta-gradient text-white shadow-[0_12px_24px_rgba(216,27,96,0.3)] hover:opacity-95"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Expense
          </SubmitButton>
          {!isCreate && onDelete && (
            <DeletePopup
              onDelete={() => onDelete(activeUserId ?? undefined)}
            ></DeletePopup>
          )}
          <Button variant="ghost" asChild>
            <Link href={`/groups/${group.id}`}>{t('cancel')}</Link>
          </Button>
          </div>
        </div>
          </div>
      </form>
    </Form>
  )
}

function formatDate(date?: Date) {
  if (!date || isNaN(date as any)) date = new Date()
  return date.toISOString().substring(0, 10)
}

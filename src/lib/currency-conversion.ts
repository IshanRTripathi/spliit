/**
 * Currency conversion utilities for multi-currency expense management
 */

export type CurrencyType = 'BASE' | 'DEST'

export interface ConversionParams {
  amount: number
  fromCurrency: CurrencyType
  toCurrency: CurrencyType
  exchangeRate: number
}

/**
 * Converts an amount from one currency to another using the provided exchange rate.
 * 
 * @param amount - The amount to convert (in minor units, e.g., cents)
 * @param fromCurrency - The currency type the amount is currently in ('BASE' or 'DEST')
 * @param toCurrency - The currency type to convert to ('BASE' or 'DEST')
 * @param exchangeRate - The exchange rate (1 BASE = exchangeRate DEST)
 * 
 * @returns The converted amount in minor units
 * 
 * @example
 * // Convert 100 INR to CNY (rate: 1 INR = 0.087 CNY)
 * convertCurrency(10000, 'BASE', 'DEST', 0.087) // Returns 870 (8.70 CNY in fen)
 * 
 * @example
 * // Convert 100 CNY to INR (rate: 1 INR = 0.087 CNY)
 * convertCurrency(10000, 'DEST', 'BASE', 0.087) // Returns 114943 (1149.43 INR in paise)
 */
export function convertCurrency({
  amount,
  fromCurrency,
  toCurrency,
  exchangeRate,
}: ConversionParams): number {
  // Same currency, no conversion needed
  if (fromCurrency === toCurrency) {
    return amount
  }

  // BASE to DEST: multiply by exchange rate
  if (fromCurrency === 'BASE' && toCurrency === 'DEST') {
    return Math.round(amount * exchangeRate)
  }

  // DEST to BASE: divide by exchange rate
  if (fromCurrency === 'DEST' && toCurrency === 'BASE') {
    return Math.round(amount / exchangeRate)
  }

  // Fallback (should never reach here)
  return amount
}

/**
 * Determines the currency type based on the currency code and group settings.
 * 
 * @param currencyCode - The currency code to check (e.g., 'USD', 'CNY')
 * @param baseCurrencyCode - The group's base currency code
 * @param destCurrencyCode - The group's destination currency code (optional)
 * 
 * @returns 'BASE' if the currency matches the base, 'DEST' if it matches destination, or 'BASE' as fallback
 */
export function getCurrencyType(
  currencyCode: string | null | undefined,
  baseCurrencyCode: string | undefined,
  destCurrencyCode: string | null | undefined,
): CurrencyType {
  if (!currencyCode) return 'BASE'
  
  if (currencyCode === destCurrencyCode) return 'DEST'
  
  return 'BASE'
}

/**
 * Converts an expense amount to the requested display currency.
 * 
 * @param expenseAmount - The stored expense amount (in minor units)
 * @param expenseOriginalCurrency - The currency code the expense was saved in (null means base currency)
 * @param baseCurrencyCode - The group's base currency code
 * @param destCurrencyCode - The group's destination currency code
 * @param exchangeRate - The exchange rate (1 BASE = exchangeRate DEST)
 * @param displayCurrency - The currency to display in ('BASE' or 'DEST')
 * 
 * @returns The converted amount in minor units
 * 
 * @example
 * // Expense saved in CNY (100 CNY), display in INR
 * // Group: INR base, CNY dest, rate 0.087
 * convertExpenseAmount(10000, 'CNY', 'INR', 'CNY', 0.087, 'BASE')
 * // Returns 114943 (1149.43 INR)
 */
export function convertExpenseAmount(
  expenseAmount: number,
  expenseOriginalCurrency: string | null | undefined,
  baseCurrencyCode: string | undefined,
  destCurrencyCode: string | null | undefined,
  exchangeRate: number | null | undefined,
  displayCurrency: CurrencyType,
): number {
  // If no exchange rate configured, return original amount
  if (!exchangeRate || !destCurrencyCode || !baseCurrencyCode) {
    return expenseAmount
  }

  // Determine what currency the expense is stored in
  const expenseCurrencyType = getCurrencyType(
    expenseOriginalCurrency,
    baseCurrencyCode,
    destCurrencyCode,
  )

  // Convert from expense currency to display currency
  return convertCurrency({
    amount: expenseAmount,
    fromCurrency: expenseCurrencyType,
    toCurrency: displayCurrency,
    exchangeRate,
  })
}

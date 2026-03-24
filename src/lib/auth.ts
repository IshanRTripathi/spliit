export const AUTH_COOKIE = 'expense_auth'
export const AUTH_USER_COOKIE = 'expense_user'

export const normalizeAuthIdentifier = (identifier: string) =>
  identifier.trim().toLowerCase()

'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AUTH_COOKIE,
  AUTH_USER_COOKIE,
  normalizeAuthIdentifier,
} from '@/lib/auth'
import { z } from 'zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

const USERS_KEY = 'expense_auth_users'

const authSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email or phone is required')
    .refine(
      (value) =>
        z.string().email().safeParse(value).success ||
        /^\+?[0-9]{7,15}$/.test(value),
      'Use a valid email or phone number',
    ),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type StoredUser = {
  identifier: string
  password: string
}

const storedUsersSchema = z.array(
  z.object({
    identifier: z.string(),
    password: z.string(),
  }),
)

export default function SignInPage() {
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')

  const [mode, setMode] = useState<'signin' | 'register'>('signin')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const title = useMemo(
    () => (mode === 'signin' ? 'Sign in to continue' : 'Create local account'),
    [mode],
  )

  useEffect(() => {
    if (document.cookie.includes(`${AUTH_COOKIE}=1`)) {
      window.location.href = nextUrl || '/groups'
    }
  }, [nextUrl])

  const submit = () => {
    setError('')
    setSuccess('')

    const parsed = authSchema.safeParse({ identifier, password })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input')
      return
    }

    const normalizedIdentifier = normalizeAuthIdentifier(parsed.data.identifier)
    const parsedUsers = storedUsersSchema.safeParse(
      JSON.parse(localStorage.getItem(USERS_KEY) ?? '[]'),
    )
    const users: StoredUser[] = parsedUsers.success ? parsedUsers.data : []
    const existingUser = users.find(
      (user) => normalizeAuthIdentifier(user.identifier) === normalizedIdentifier,
    )

    if (mode === 'register') {
      if (existingUser) {
        setError('Account already exists. Try signing in.')
        return
      }
      users.push({ identifier: normalizedIdentifier, password: parsed.data.password })
      localStorage.setItem(USERS_KEY, JSON.stringify(users))
      setMode('signin')
      setSuccess('Account created. You can now sign in.')
      return
    }

    if (!existingUser || existingUser.password !== parsed.data.password) {
      setError('Invalid credentials')
      return
    }

    document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    document.cookie = `${AUTH_USER_COOKIE}=${encodeURIComponent(normalizedIdentifier)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`
    window.location.href = nextUrl || '/groups'
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <section className="page-section p-5 sm:p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Local auth MVP without external provider.
        </p>

        <div className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email or phone</label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com or +919999999999"
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Password</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="At least 8 characters"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
        </div>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        {success ? <p className="mt-3 text-sm text-primary">{success}</p> : null}

        <Button className="mt-5 w-full" onClick={submit}>
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </Button>

        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => {
            setMode((current) => (current === 'signin' ? 'register' : 'signin'))
            setError('')
            setSuccess('')
          }}
        >
          {mode === 'signin'
            ? 'Need an account? Register'
            : 'Already have an account? Sign in'}
        </Button>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          <Link href="/" className="underline underline-offset-4">
            Back to home
          </Link>
        </p>
      </section>
    </main>
  )
}

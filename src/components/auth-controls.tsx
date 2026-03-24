'use client'

import { Button } from '@/components/ui/button'
import { AUTH_COOKIE, AUTH_USER_COOKIE } from '@/lib/auth'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export function AuthControls() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setIsAuthenticated(document.cookie.includes(`${AUTH_COOKIE}=1`))
  }, [])

  const handleSignOut = () => {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; samesite=lax`
    document.cookie = `${AUTH_USER_COOKIE}=; path=/; max-age=0; samesite=lax`
    setIsAuthenticated(false)
    window.location.href = '/signin'
  }

  if (isAuthenticated) {
    return (
      <Button variant="outline" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    )
  }

  return (
    <Button variant="default" size="sm" asChild>
      <Link href="/signin">Sign in</Link>
    </Button>
  )
}

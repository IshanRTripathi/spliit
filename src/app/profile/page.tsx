import { AUTH_USER_COOKIE } from '@/lib/auth'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AuthControls } from '@/components/auth-controls'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function ProfilePage() {
  const userIdentifier =
    (await cookies()).get(AUTH_USER_COOKIE)?.value ?? 'Not signed in'

  return (
    <main className="px-3 sm:px-5">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm break-all">{decodeURIComponent(userIdentifier)}</p>
          <div className="flex items-center justify-between gap-3">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <div>
            <AuthControls />
          </div>
          <Button asChild variant="secondary" className="w-full justify-start">
            <Link href="/groups">Open Group Settings</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

'use client'

import { Button } from '@/components/ui/button'
import { AUTH_COOKIE } from '@/lib/auth'
import { trpc } from '@/trpc/client'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Props = {
  params: Promise<{ token: string }>
}

export default function InvitePage({ params }: Props) {
  const [token, setToken] = useState<string>()
  const [error, setError] = useState<string>()
  const [statusText, setStatusText] = useState('Preparing invite...')
  const router = useRouter()
  const acceptInvite = trpc.groups.acceptInvite.useMutation()
  const { data } = trpc.groups.getInvite.useQuery(
    { token: token ?? '' },
    { enabled: Boolean(token) },
  )

  useEffect(() => {
    params.then((value) => setToken(value.token))
  }, [params])

  useEffect(() => {
    if (!token) return
    const isSignedIn = document.cookie.includes(`${AUTH_COOKIE}=1`)
    if (!isSignedIn) {
      setStatusText('Redirecting to sign in...')
      router.replace(`/signin?next=${encodeURIComponent(`/invite/${token}`)}`)
      return
    }

    setStatusText('Joining group...')
    acceptInvite
      .mutateAsync({ token })
      .then((result) => {
        router.replace(`/groups/${result.groupId}/expenses`)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Could not accept invite')
      })
  }, [token])

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <section className="page-section p-5 sm:p-6">
        <h1 className="text-xl font-semibold">Group invite</h1>
        {data?.invite?.groupName ? (
          <p className="mt-2 text-sm text-muted-foreground">
            You were invited to join <strong>{data.invite.groupName}</strong>.
          </p>
        ) : null}

        {!error ? (
          <p className="mt-4 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            {statusText}
          </p>
        ) : (
          <>
            <p className="mt-4 text-sm text-destructive">{error}</p>
            <Button asChild className="mt-4">
              <Link href="/groups">Go to groups</Link>
            </Button>
          </>
        )}
      </section>
    </main>
  )
}

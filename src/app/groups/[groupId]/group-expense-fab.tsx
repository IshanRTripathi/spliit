'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function GroupExpenseFab({ groupId }: { groupId: string }) {
  const pathname = usePathname()
  const hideFab =
    pathname.includes('/expenses/create') || /\/expenses\/[^/]+\/edit$/.test(pathname)

  if (hideFab) return null

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-6">
      <Button asChild size="icon" className="h-12 w-12 rounded-full shadow-lg">
        <Link href={`/groups/${groupId}/expenses/create`} title="Add expense">
          <Plus className="h-5 w-5" />
        </Link>
      </Button>
    </div>
  )
}

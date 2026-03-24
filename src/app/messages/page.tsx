import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare } from 'lucide-react'
import Link from 'next/link'

export default function MessagesPage() {
  return (
    <main className="px-3 sm:px-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
          </CardTitle>
          <CardDescription>
            Messaging UI is staged for the next phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/groups">Open Groups</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}

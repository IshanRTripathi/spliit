'use client'
import { CopyButton } from '@/components/copy-button'
import { ShareUrlButton } from '@/components/share-url-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useBaseUrl } from '@/lib/hooks'
import { trpc } from '@/trpc/client'
import { Group } from '@prisma/client'
import { Loader2, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

type Props = {
  group: Group
}

export function ShareButton({ group }: Props) {
  const t = useTranslations('Share')
  const baseUrl = useBaseUrl()
  const [inviteToken, setInviteToken] = useState<string>()
  const createInvite = trpc.groups.createInvite.useMutation()

  useEffect(() => {
    if (!inviteToken && !createInvite.isPending) {
      createInvite
        .mutateAsync({ groupId: group.id })
        .then((result) => setInviteToken(result.token))
        .catch(() => undefined)
    }
  }, [group.id, inviteToken, createInvite])

  const url = useMemo(
    () => (baseUrl && inviteToken ? `${baseUrl}/invite/${inviteToken}` : undefined),
    [baseUrl, inviteToken],
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button title={t('title')} size="icon" className="flex-shrink-0">
          <UserPlus className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="[&_p]:text-sm flex flex-col gap-3">
        <p>{t('description')}</p>
        {!url && createInvite.isPending && (
          <p className="text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating invite link...
          </p>
        )}
        {url && (
          <div className="flex gap-2">
            <Input className="flex-1" defaultValue={url} readOnly />
            <CopyButton text={url} />
            <ShareUrlButton
              text={`Join my group ${group.name}`}
              url={url}
            />
          </div>
        )}
        <p>
          <strong>{t('warning')}</strong> {t('warningHelp')}
        </p>
      </PopoverContent>
    </Popover>
  )
}

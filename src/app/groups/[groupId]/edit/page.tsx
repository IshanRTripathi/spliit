import { GroupSettingsHub } from '@/app/groups/[groupId]/edit/group-settings-hub'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  return <GroupSettingsHub groupId={groupId} />
}

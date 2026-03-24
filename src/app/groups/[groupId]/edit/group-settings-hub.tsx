'use client'

import { ActivityList } from '@/app/groups/[groupId]/activity/activity-list'
import GroupInformation from '@/app/groups/[groupId]/information/group-information'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { EditGroup } from './edit-group'

export function GroupSettingsHub({ groupId }: { groupId: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-1">
          <ActivityList />
        </CardContent>
      </Card>

      <GroupInformation groupId={groupId} />

      <EditGroup />
    </div>
  )
}

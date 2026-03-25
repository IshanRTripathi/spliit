'use client'

import { useState } from 'react'
import { ActivityList } from '@/app/groups/[groupId]/activity/activity-list'
import GroupInformation from '@/app/groups/[groupId]/information/group-information'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { EditGroup } from './edit-group'

export function GroupSettingsHub({ groupId }: { groupId: string }) {
  const [showActivity, setShowActivity] = useState(false)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowActivity(!showActivity)}
            >
              {showActivity ? (
                <>
                  Hide <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  Show <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showActivity && (
          <CardContent className="pt-1">
            <ActivityList />
          </CardContent>
        )}
      </Card>

      <GroupInformation groupId={groupId} />

      <EditGroup />
    </div>
  )
}

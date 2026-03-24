import { randomId } from '@/lib/api'
import { env } from '@/lib/env'
import { POST as route } from 'next-s3-upload/route'

export const POST = route.configure({
  key(req, filename) {
    const [, extension] = filename.match(/(\.[^\.]*)$/) ?? [null, '']
    const timestamp = new Date().toISOString()
    const random = randomId()
    const groupIdFromQuery = req.nextUrl.searchParams.get('groupId')
    const referer = req.headers.get('referer')
    const groupIdFromReferer =
      referer?.match(/\/groups\/([^/?#]+)/)?.[1] ?? undefined
    const groupId = groupIdFromQuery || groupIdFromReferer || 'ungrouped'
    return `${groupId}/document-${timestamp}-${random}${extension.toLowerCase()}`
  },
  endpoint: env.S3_UPLOAD_ENDPOINT,
  // forcing path style is only necessary for providers other than AWS
  forcePathStyle: !!env.S3_UPLOAD_ENDPOINT,
})

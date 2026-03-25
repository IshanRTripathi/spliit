import { randomId } from '@/lib/api'
import { env } from '@/lib/env'
import { POST as route } from 'next-s3-upload/route'

const missing = [
  !env.S3_UPLOAD_BUCKET ||
  env.S3_UPLOAD_BUCKET === 'undefined' ||
  env.S3_UPLOAD_BUCKET === 'null'
    ? 'S3_UPLOAD_BUCKET'
    : null,
  !env.S3_UPLOAD_REGION ||
  env.S3_UPLOAD_REGION === 'undefined' ||
  env.S3_UPLOAD_REGION === 'null'
    ? 'S3_UPLOAD_REGION'
    : null,
  !env.S3_UPLOAD_KEY ||
  env.S3_UPLOAD_KEY === 'undefined' ||
  env.S3_UPLOAD_KEY === 'null'
    ? 'S3_UPLOAD_KEY'
    : null,
  !env.S3_UPLOAD_SECRET ||
  env.S3_UPLOAD_SECRET === 'undefined' ||
  env.S3_UPLOAD_SECRET === 'null'
    ? 'S3_UPLOAD_SECRET'
    : null,
  !env.S3_UPLOAD_ENDPOINT ||
  env.S3_UPLOAD_ENDPOINT === 'undefined' ||
  env.S3_UPLOAD_ENDPOINT === 'null'
    ? 'S3_UPLOAD_ENDPOINT'
    : null,
].filter(Boolean) as string[]

if (missing.length > 0) {
  throw new Error(
    `Missing Supabase Storage S3 env vars for uploads: ${missing.join(
      ', ',
    )}`,
  )
}

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
  accessKeyId: env.S3_UPLOAD_KEY,
  secretAccessKey: env.S3_UPLOAD_SECRET,
  bucket: env.S3_UPLOAD_BUCKET,
  region: env.S3_UPLOAD_REGION,
  endpoint: env.S3_UPLOAD_ENDPOINT,
  // forcing path style is only necessary for providers other than AWS
  forcePathStyle: !!env.S3_UPLOAD_ENDPOINT,
})

export function supabaseS3UrlToPublicObjectUrl(url: string): string {
  try {
    const u = new URL(url)

    // Supabase "S3 API" host: <project-ref>.storage.supabase.co
    // Supabase public object host: <project-ref>.supabase.co
    if (u.hostname.endsWith('.storage.supabase.co')) {
      u.hostname = u.hostname.replace('.storage.supabase.co', '.supabase.co')
    }

    // Supabase paths:
    //   /storage/v1/s3/<bucket>/<key>
    //   /storage/v1/object/public/<bucket>/<key>
    u.pathname = u.pathname.replace(
      '/storage/v1/s3/',
      '/storage/v1/object/public/',
    )

    return u.toString()
  } catch {
    return url
  }
}


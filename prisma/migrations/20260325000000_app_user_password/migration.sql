-- Plain-text password for local MVP auth (validated server-side; stored in DB).
ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "password" TEXT;

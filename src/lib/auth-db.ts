import { prisma } from '@/lib/prisma'
import { normalizeAuthIdentifier } from '@/lib/auth'
import { nanoid } from 'nanoid'

export async function registerAuthUser(identifier: string, password: string) {
  const normalized = normalizeAuthIdentifier(identifier)
  const existing = await prisma.appUser.findUnique({
    where: { identifier: normalized },
  })
  if (existing?.password) {
    return { ok: false as const, code: 'EXISTS' as const }
  }
  if (existing) {
    await prisma.appUser.update({
      where: { id: existing.id },
      data: { password },
    })
    return { ok: true as const }
  }
  await prisma.appUser.create({
    data: {
      id: nanoid(),
      identifier: normalized,
      password,
    },
  })
  return { ok: true as const }
}

export async function verifyAuthUserCredentials(
  identifier: string,
  password: string,
) {
  const normalized = normalizeAuthIdentifier(identifier)
  const user = await prisma.appUser.findUnique({
    where: { identifier: normalized },
  })
  if (!user?.password || user.password !== password) {
    return null
  }
  return { identifier: normalized }
}

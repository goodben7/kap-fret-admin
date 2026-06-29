import type { TicketUserRef } from '@/types/ticket'

/** displayName → email → id */
export function getUserRefLabel(user: string | TicketUserRef | undefined | null): string | undefined {
  if (!user) return undefined
  if (typeof user === 'string') return user.trim() || undefined

  const displayName = user.displayName?.trim()
  if (displayName) return displayName

  const email = user.email?.trim()
  if (email) return email

  const id = user.id?.trim()
  return id || undefined
}

import type { AuthenticationTokenResponse } from '@/types/auth'

export function extractJwtToken(data: AuthenticationTokenResponse): string {
  if (data.token) return data.token

  const record = data as AuthenticationTokenResponse & Record<string, string>
  if (record.access_token) return record.access_token

  throw new Error('Token JWT introuvable dans la réponse du serveur')
}

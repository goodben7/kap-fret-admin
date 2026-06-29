import { api } from './api'
import { AUTH_ENDPOINTS } from '@/constants/auth'
import { STORAGE_KEYS } from '@/constants/storage'
import { extractJwtToken } from '@/lib/auth-token'
import { normalizeUser } from '@/lib/normalize-user'
import type {
  AuthTokens,
  AuthUser,
  AuthenticationTokenResponse,
  LoginCredentials,
} from '@/types/auth'

const JSON_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
} as const

export const authService = {
  async login(credentials: LoginCredentials): Promise<{ user: AuthUser; tokens: AuthTokens }> {
    const { data } = await api.post<AuthenticationTokenResponse>(
      AUTH_ENDPOINTS.TOKEN,
      {
        username: credentials.identifier.trim(),
        password: credentials.password,
      },
      { headers: JSON_HEADERS },
    )

    const token = extractJwtToken(data)
    const refreshToken = data.refresh_token

    // Stocker le token AVANT /api/users/about pour que l'intercepteur Axios l'envoie
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    }

    const user = await this.getCurrentUser({ skipAuthRedirect: true })
    this.persistAuth(token, refreshToken, user)

    return { user, tokens: { token, refreshToken } }
  },

  async getCurrentUser(options?: { skipAuthRedirect?: boolean }): Promise<AuthUser> {
    const { data } = await api.get<unknown>(AUTH_ENDPOINTS.ME, {
      headers: { Accept: 'application/ld+json' },
      skipAuthRedirect: options?.skipAuthRedirect,
    })
    return normalizeUser(data)
  },

  persistAuth(token: string, refreshToken: string | undefined, user: AuthUser): void {
    localStorage.setItem(STORAGE_KEYS.TOKEN, token)
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
    }
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
  },

  getStoredUser(): AuthUser | null {
    const stored = localStorage.getItem(STORAGE_KEYS.USER)
    if (!stored) return null
    try {
      return normalizeUser(JSON.parse(stored) as unknown)
    } catch {
      return null
    }
  },

  getStoredToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.TOKEN)
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEYS.TOKEN)
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
    localStorage.removeItem(STORAGE_KEYS.USER)
  },

  isAuthenticated(): boolean {
    return !!this.getStoredToken()
  },
}

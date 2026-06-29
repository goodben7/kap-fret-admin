import type { Role } from '@/constants/roles'

export interface AuthTokens {
  token: string
  refreshToken?: string
}

export interface LoginCredentials {
  identifier: string
  password: string
}

/** Réponse Lexik JWT / API Platform — POST /api/authentication_token */
export interface AuthenticationTokenResponse {
  token: string
  refresh_token?: string
}

export interface AuthUser {
  '@id': string
  '@type': string
  id: string | number
  email?: string
  phone?: string
  displayName?: string
  firstName: string
  lastName: string
  personType?: string
  roles: Role[]
  holderType: 'ISSUING_OFFICE' | string
  holderId?: string
  holder?: {
    '@id': string
    name: string
  }
  issuingOffice?: {
    '@id': string
    name: string
  }
  profile?: {
    id: string
    label: string
  }
  active: boolean
}

export interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

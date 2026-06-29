import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { STORAGE_KEYS } from '@/constants/storage'
import { authService } from '@/services/auth.service'
import { issuingOfficeService } from '@/services/issuing-office.service'
import type { AuthUser, LoginCredentials } from '@/types/auth'

export interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  hasIssuingOffice: boolean
  issuingOfficeName: string | null
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  logout: () => void
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [issuingOfficeName, setIssuingOfficeName] = useState<string | null>(null)

  const initAuth = useCallback(async () => {
    const storedToken = authService.getStoredToken()
    const storedUser = authService.getStoredUser()

    if (storedToken && storedUser) {
      setToken(storedToken)
      setUser(storedUser)
      try {
        const freshUser = await authService.getCurrentUser()
        setUser(freshUser)
        authService.persistAuth(storedToken, localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ?? undefined, freshUser)
      } catch {
        authService.logout()
        setToken(null)
        setUser(null)
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    void initAuth()
  }, [initAuth])

  useEffect(() => {
    let cancelled = false

    const resolveIssuingOfficeName = async () => {
      if (!user || user.holderType !== 'ISSUING_OFFICE' || !user.holderId) {
        setIssuingOfficeName(null)
        return
      }

      const embeddedName = user.holder?.name ?? user.issuingOffice?.name
      if (embeddedName && embeddedName !== user.holderId) {
        setIssuingOfficeName(embeddedName)
        return
      }

      try {
        const office = await issuingOfficeService.getById(user.holderId)
        if (!cancelled) setIssuingOfficeName(office.name)
      } catch {
        if (!cancelled) setIssuingOfficeName(embeddedName ?? null)
      }
    }

    void resolveIssuingOfficeName()
    return () => {
      cancelled = true
    }
  }, [user?.id, user?.holderId, user?.holderType, user?.holder?.name, user?.issuingOffice?.name])

  const login = useCallback(async (credentials: LoginCredentials) => {
    const { user: loggedUser, tokens } = await authService.login(credentials)
    setUser(loggedUser)
    setToken(tokens.token)
    return loggedUser
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    setUser(null)
    setToken(null)
  }, [])

  const refreshUser = useCallback(async () => {
    const freshUser = await authService.getCurrentUser()
    setUser(freshUser)
    const storedToken = authService.getStoredToken()
    if (storedToken) {
      authService.persistAuth(storedToken, localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ?? undefined, freshUser)
    }
  }, [])

  const hasIssuingOffice =
    user?.holderType === 'ISSUING_OFFICE' && !!(user.holderId || user.holder?.['@id'])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      isLoading,
      hasIssuingOffice,
      issuingOfficeName,
      login,
      logout,
      refreshUser,
    }),
    [user, token, isLoading, hasIssuingOffice, issuingOfficeName, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

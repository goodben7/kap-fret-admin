import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { toast } from 'sonner'
import { AUTH_ENDPOINTS } from '@/constants/auth'
import { STORAGE_KEYS } from '@/constants/storage'
import { getApiBaseUrl } from '@/lib/api-config'
import type { HydraError, HydraViolation } from '@/types/hydra'

export const api = axios.create({
  headers: {
    Accept: 'application/ld+json',
    'Content-Type': 'application/ld+json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.baseURL = getApiBaseUrl()

  const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  // Les requêtes GET n'ont pas de body — retirer Content-Type pour éviter des rejets côté serveur
  if (config.method?.toLowerCase() === 'get') {
    config.headers.delete('Content-Type')
  }

  return config
})

let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<HydraError>) => {
    const originalRequest = error.config

    const skipAuthRedirect = originalRequest?.skipAuthRedirect
    const isLoginRequest = originalRequest?.url?.includes('/authentication_token')

    if (skipAuthRedirect || isLoginRequest) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)

      if (refreshToken && !isRefreshing) {
        isRefreshing = true
        try {
          const { data } = await axios.post(
            `${getApiBaseUrl()}${AUTH_ENDPOINTS.REFRESH}`,
            { refresh_token: refreshToken },
            { headers: { Accept: 'application/json', 'Content-Type': 'application/json' } },
          )
          const newToken = data.token as string
          localStorage.setItem(STORAGE_KEYS.TOKEN, newToken)
          onTokenRefreshed(newToken)
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          originalRequest._retry = true
          return api(originalRequest)
        } catch {
          localStorage.removeItem(STORAGE_KEYS.TOKEN)
          localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
          localStorage.removeItem(STORAGE_KEYS.USER)
          window.location.href = '/login'
        } finally {
          isRefreshing = false
        }
      } else if (refreshToken && isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            if (originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            }
          })
        })
      } else {
        localStorage.removeItem(STORAGE_KEYS.TOKEN)
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
        localStorage.removeItem(STORAGE_KEYS.USER)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
        }
      }
    }

    handleApiError(error)
    return Promise.reject(error)
  },
)

function getDefaultErrorMessage(status: number): string {
  const messages: Record<number, string> = {
    400: 'Requête invalide',
    401: 'Non authentifié',
    403: 'Accès refusé',
    404: 'Ressource introuvable',
    500: 'Erreur serveur',
  }
  return messages[status] ?? 'Une erreur est survenue'
}

/** Extrait le message d'erreur API (Hydra, RFC 7807, Symfony). */
export function extractApiErrorMessage(
  data: HydraError | undefined,
  status?: number,
): string {
  if (!data) {
    return status != null ? getDefaultErrorMessage(status) : 'Une erreur est survenue'
  }

  return (
    data['hydra:description'] ??
    data.detail ??
    data['hydra:title'] ??
    data.title ??
    data.message ??
    (status != null ? getDefaultErrorMessage(status) : 'Une erreur est survenue')
  )
}

export function handleApiError(error: AxiosError<HydraError>): void {
  if (!error.response) {
    toast.error('Erreur réseau. Vérifiez votre connexion.')
    return
  }

  const { status, data } = error.response

  if (status === 422 && data.violations?.length) {
    const messages = data.violations.map((v: HydraViolation) => `${v.propertyPath}: ${v.message}`)
    toast.error(messages.join('\n'))
    return
  }

  toast.error(extractApiErrorMessage(data, status))
}

export function getValidationErrors(error: AxiosError<HydraError>): Record<string, string> {
  const violations = error.response?.data?.violations ?? []
  return violations.reduce<Record<string, string>>((acc, v) => {
    acc[v.propertyPath] = v.message
    return acc
  }, {})
}

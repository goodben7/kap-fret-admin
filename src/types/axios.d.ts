import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Flag interne : ne pas rediriger vers /login sur 401 (ex. pendant le login). */
    skipAuthRedirect?: boolean
    /** Flag interne : évite une boucle de refresh token. */
    _retry?: boolean
  }
}

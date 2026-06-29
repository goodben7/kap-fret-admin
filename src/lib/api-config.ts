/**
 * En développement : toujours URL relative → proxy Vite (/api → backend).
 * Évite les erreurs CORS (preflight 400/307).
 *
 * En production : VITE_API_BASE_URL doit pointer vers le backend.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV) {
    return ''
  }

  const envUrl = import.meta.env.VITE_API_BASE_URL
  if (envUrl && envUrl.trim() !== '') {
    return envUrl.replace(/\/$/, '')
  }

  if (import.meta.env.PROD) {
    console.error(
      '[KAP FRET] VITE_API_BASE_URL est manquant en production. '
      + 'Configurez https://api.kap-fret.ereborhub.cloud dans Netlify.',
    )
  }

  return 'http://localhost:8000'
}

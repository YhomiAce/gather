import type { H3Event } from 'h3'

/**
 * Absolute base URL for links: `NUXT_PUBLIC_SITE_URL` if set, otherwise the
 * request's own origin (honouring X-Forwarded-* from a reverse proxy).
 */
export function siteUrl(event: H3Event): string {
  const configured = useRuntimeConfig(event).public.siteUrl
  if (configured) return configured.replace(/\/+$/, '')
  return getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
}

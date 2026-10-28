/**
 * Absolute site origin: `NUXT_PUBLIC_SITE_URL` when configured, otherwise the
 * current request/page origin.
 */
export function useSiteUrl(): string {
  const configured = useRuntimeConfig().public.siteUrl
  if (configured) return configured.replace(/\/+$/, '')
  return useRequestURL({ xForwardedHost: true, xForwardedProto: true }).origin
}

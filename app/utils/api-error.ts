interface ErrorLike {
  data?: { statusMessage?: string; message?: string; data?: { issues?: { path: string; message: string }[] } }
  statusMessage?: string
  message?: string
}

/**
 * Extracts a human-readable message from a `$fetch` / `useFetch` error.
 */
export function apiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!error || typeof error !== 'object') return fallback
  const e = error as ErrorLike
  const issue = e.data?.data?.issues?.[0]
  if (issue) return issue.path ? `${issue.message} (${issue.path})` : issue.message
  return e.data?.statusMessage || e.data?.message || e.statusMessage || fallback
}

/**
 * Error to throw from a page whose data failed to load: keeps the API's status
 * (404 stays "not found", 503 stays "unavailable").
 */
export function pageLoadError(error: { statusCode?: number } | null | undefined, notFoundMessage: string) {
  const statusCode = error?.statusCode ?? 404
  return createError({
    statusCode,
    statusMessage: statusCode === 404 ? notFoundMessage : 'This page could not be loaded right now',
  })
}

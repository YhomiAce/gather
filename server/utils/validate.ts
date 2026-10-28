import type { H3Event } from 'h3'
import type { z } from 'zod'

/** One field-level validation problem, as returned to clients. */
export interface FieldIssue {
  path: string
  message: string
}

function fail(error: z.ZodError): never {
  const issues: FieldIssue[] = error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
  throw createError({
    statusCode: 400,
    statusMessage: issues[0]?.message ?? 'Invalid input',
    data: { issues },
  })
}

/**
 * Parses the JSON body with a zod schema; responds 400 with field issues on failure.
 */
export async function validateBody<S extends z.ZodType>(event: H3Event, schema: S): Promise<z.output<S>> {
  const raw: unknown = await readBody(event).catch(() => {
    throw createError({ statusCode: 400, statusMessage: 'Body must be valid JSON' })
  })
  const result = schema.safeParse(raw ?? {})
  if (!result.success) fail(result.error)
  return result.data
}

/**
 * Parses route params with a zod schema; responds 404 on failure (a malformed
 * slug or token can never match anything).
 */
export function validateParams<S extends z.ZodType>(event: H3Event, schema: S): z.output<S> {
  const result = schema.safeParse(getRouterParams(event, { decode: true }))
  if (!result.success) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return result.data
}

import { updateRsvp } from '../../services/rsvps'
import type { RsvpResult } from '../../../shared/types/api'

/** Changes a guest's RSVP (name, answer, Going/Maybe/Can't go). */
export default defineEventHandler(async (event): Promise<RsvpResult> => {
  enforceRsvpRateLimit(event)
  const { token } = validateParams(event, tokenParamSchema)
  const body = await validateBody(event, rsvpUpdateSchema)
  return updateRsvp(await useReadyDb(), token, body)
})

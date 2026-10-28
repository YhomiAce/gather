import { createEvent } from '../../services/events'
import type { CreatedEvent } from '../../../shared/types/api'

/** Creates an event and returns its slug and the host's private manage token. */
export default defineEventHandler(async (event): Promise<CreatedEvent> => {
  enforceCreateRateLimit(event)
  const body = await validateBody(event, eventInputSchema)
  if (isHoneypotTripped(body)) {
    // Pretend it worked so bots don't learn anything.
    return { slug: 'thanks', manageToken: createToken().token }
  }
  setResponseStatus(event, 201)
  return createEvent(await useReadyDb(), body)
})

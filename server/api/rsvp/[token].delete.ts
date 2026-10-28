import { cancelRsvp } from '../../services/rsvps'

/** Cancels a guest's RSVP; the first waitlisted guest takes the freed seat. */
export default defineEventHandler(async (event) => {
  const { token } = validateParams(event, tokenParamSchema)
  const promoted = await cancelRsvp(await useReadyDb(), token)
  return { status: 'cancelled', promoted: promoted.length }
})

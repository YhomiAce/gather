import { listUpcomingPublicEvents } from '../../services/events'

/** Upcoming public events for the home page. */
export default defineEventHandler(async () => {
  return listUpcomingPublicEvents(await useReadyDb())
})

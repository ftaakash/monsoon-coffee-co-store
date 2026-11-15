import { route } from "@server/http"
import { getEventDetail } from "@server/services/catalog"

export const GET = route<{ id: string }>((_req, { id }) => ({ event: getEventDetail(id) }))

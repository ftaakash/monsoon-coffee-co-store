import { route } from "@server/http"
import { retrieveOrder } from "@server/services/orders"

export const GET = route<{ id: string }>((_req, { id }) => ({ order: retrieveOrder(id) }))

import { route } from "@server/http"
import { retrieveOrder } from "@server/services/orders"

// Declining leaves the order where it is.
export const POST = route<{ id: string }>((_req, { id }) => ({ order: retrieveOrder(id) }))

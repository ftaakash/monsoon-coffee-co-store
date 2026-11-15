import { requireAdmin, route } from "@server/http"
import { retrieveOrder } from "@server/services/orders"

export const GET = route<{ id: string }>((req, { id }) => {
  requireAdmin(req)
  return { order: retrieveOrder(id) }
})

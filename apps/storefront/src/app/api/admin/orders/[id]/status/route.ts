import { readJson, requireAdmin, route } from "@server/http"
import { advanceOrder } from "@server/services/orders"

// Body: { action: "shipped" | "out_for_delivery" | "delivered" | "canceled" }
export const POST = route<{ id: string }>(async (req, { id }) => {
  requireAdmin(req)
  const { action } = await readJson(req)
  return { order: advanceOrder(id, action) }
})

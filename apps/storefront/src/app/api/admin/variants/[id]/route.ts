import { readJson, requireAdmin, route } from "@server/http"
import { deleteVariant, updateVariant } from "@server/services/admin"

// Body: { title?, price, original_price?, manage_inventory, stock? }
export const POST = route<{ id: string }>(async (req, { id }) => {
  requireAdmin(req)
  return { product: updateVariant(id, await readJson(req)) }
})

export const DELETE = route<{ id: string }>((req, { id }) => {
  requireAdmin(req)
  return { product: deleteVariant(id) }
})

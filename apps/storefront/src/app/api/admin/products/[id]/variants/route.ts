import { readJson, requireAdmin, route } from "@server/http"
import { addVariant } from "@server/services/admin"

// Body: { title, price, original_price?, manage_inventory, stock? }
export const POST = route<{ id: string }>(async (req, { id }) => {
  requireAdmin(req)
  return { product: addVariant(id, await readJson(req)) }
})

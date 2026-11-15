import { readJson, route } from "@server/http"
import { addLineItem } from "@server/services/carts"

// Body: { variant_id, quantity }
export const POST = route<{ id: string }>(async (req, { id }) => {
  const { variant_id, quantity } = await readJson(req)
  return { cart: addLineItem(id, variant_id, Number(quantity)) }
})

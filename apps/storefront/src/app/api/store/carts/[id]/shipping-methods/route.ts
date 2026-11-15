import { readJson, route } from "@server/http"
import { setShippingMethods } from "@server/services/carts"

// Body: { option_ids: string[] }, one option per shipping profile in the cart.
export const POST = route<{ id: string }>(async (req, { id }) => {
  const { option_ids } = await readJson<{ option_ids: string[] }>(req)
  return { cart: setShippingMethods(id, Array.isArray(option_ids) ? option_ids : []) }
})

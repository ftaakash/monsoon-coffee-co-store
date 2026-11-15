import { optionalCustomer, readJson, route } from "@server/http"
import { createCart } from "@server/services/carts"

// Body: { region_id?, email? }. A signed-in shopper's cart is linked to them.
export const POST = route(async (req) => {
  const body = await readJson(req).catch(() => ({}) as Record<string, any>)
  return {
    cart: createCart({ region_id: body.region_id, email: body.email, customer_id: optionalCustomer(req) }),
  }
})

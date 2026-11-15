import { readJson, route } from "@server/http"
import { notFound } from "@server/errors"
import { retrieveCart, updateCart } from "@server/services/carts"

export const GET = route<{ id: string }>((_req, { id }) => {
  const cart = retrieveCart(id)
  if (!cart) throw notFound("Cart not found")
  return { cart }
})

// Body: { email?, region_id?, shipping_address?, billing_address?, promo_codes? }
export const POST = route<{ id: string }>(async (req, { id }) => {
  const { email, region_id, shipping_address, billing_address, promo_codes } = await readJson(req)
  return { cart: updateCart(id, { email, region_id, shipping_address, billing_address, promo_codes }) }
})

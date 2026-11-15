import { route } from "@server/http"
import { retrieveCart } from "@server/services/carts"

// Metro pincode prefixes that get faster delivery from the Bengaluru roastery.
const METRO_PREFIXES = ["56", "11", "40", "60", "70", "50", "41"]

// GET /api/store/pincode/560038?cart_id=… -> serviceability + delivery estimate.
// Any valid Indian pincode (first digit 1-8) is serviceable.
export const GET = route<{ code: string }>((req, { code }) => {
  if (!/^[1-8]\d{5}$/.test(code)) {
    return { serviceable: false, pincode: code, error: "We don't deliver to this pincode yet." }
  }
  const cartId = req.nextUrl.searchParams.get("cart_id")
  const cart = cartId ? retrieveCart(cartId) : null
  return {
    serviceable: true,
    pincode: code,
    amount: cart?.shipping_total ?? 0,
    currency: (cart?.currency_code ?? "inr").toUpperCase(),
    courier_name: "Demo Couriers",
    expected_delivery_days: METRO_PREFIXES.some((p) => code.startsWith(p)) ? 2 : 5,
  }
})

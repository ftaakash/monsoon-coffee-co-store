"use server"

import type { PincodeEstimate } from "@modules/common/components/monsoon/pincode-check"
import { mockCart } from "@lib/mock/db"

// Metro pincode prefixes that get next-day-ish delivery from the Bengaluru
// roastery. Everything else in India is a few days out.
const METRO_PREFIXES = ["56", "11", "40", "60", "70", "50", "41"]

/**
 * Pincode serviceability + delivery estimate. Any valid Indian pincode (first
 * digit 1–8) is serviceable; the price comes from the cart's shipping method.
 */
export async function checkPincode(
  pincode: string,
  cartId?: string
): Promise<PincodeEstimate> {
  if (!/^[1-8]\d{5}$/.test(pincode)) {
    return {
      serviceable: false,
      pincode,
      error: "We don't deliver to this pincode yet.",
    }
  }

  const cart = cartId ? mockCart.retrieve(cartId) : null
  const isMetro = METRO_PREFIXES.some((p) => pincode.startsWith(p))

  return {
    serviceable: true,
    pincode,
    amount: cart?.shipping_total ?? 0,
    currency: (cart?.currency_code ?? "inr").toUpperCase(),
    courier_name: "Demo Couriers",
    expected_delivery_days: isMetro ? 2 : 5,
  }
}

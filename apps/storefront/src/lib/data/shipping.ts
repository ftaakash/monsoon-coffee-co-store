"use server"

import type { PincodeEstimate } from "@modules/common/components/monsoon/pincode-check"
import { storeApi } from "./api"

/**
 * Pincode serviceability + delivery estimate, priced from the cart's
 * shipping method when a cart id is given.
 */
export async function checkPincode(
  pincode: string,
  cartId?: string
): Promise<PincodeEstimate> {
  try {
    return await storeApi<PincodeEstimate>(`/pincode/${encodeURIComponent(pincode)}`, {
      query: { cart_id: cartId },
    })
  } catch (e) {
    return { serviceable: false, pincode, error: (e as Error).message }
  }
}

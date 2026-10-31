"use server"

import { HttpTypes } from "@medusajs/types"
import { SHIPPING_OPTIONS } from "@lib/mock/catalog"
import { mockCart } from "@lib/mock/db"

// Only the options whose shipping profile is needed by an item in the cart.
export const listCartShippingMethods = async (
  cartId: string
): Promise<HttpTypes.StoreCartShippingOption[] | null> => {
  const cart = mockCart.retrieve(cartId)
  if (!cart) return null

  const profiles = new Set(
    (cart.items ?? []).map(
      (i) =>
        (i.product as { shipping_profile?: { id?: string } } | null)
          ?.shipping_profile?.id
    )
  )
  return SHIPPING_OPTIONS.filter((o) => profiles.has(o.shipping_profile_id))
}

export const calculatePriceForShippingOption = async (
  optionId: string,
  _cartId: string,
  _data?: Record<string, unknown>
) => SHIPPING_OPTIONS.find((o) => o.id === optionId) ?? null

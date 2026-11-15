"use server"

import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"

// Only the options whose shipping profile is needed by an item in the cart.
export const listCartShippingMethods = async (
  cartId: string
): Promise<HttpTypes.StoreCartShippingOption[] | null> => {
  try {
    return (
      await storeApi<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>(
        `/carts/${cartId}/shipping-options`
      )
    ).shipping_options
  } catch {
    return null
  }
}

export const calculatePriceForShippingOption = async (
  optionId: string,
  _cartId: string,
  _data?: Record<string, unknown>
) =>
  (
    await storeApi<{ shipping_options: HttpTypes.StoreCartShippingOption[] }>("/shipping-options")
  ).shipping_options.find((o) => o.id === optionId) ?? null

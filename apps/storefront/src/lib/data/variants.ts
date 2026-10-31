"use server"

import { HttpTypes } from "@medusajs/types"
import { listAllProducts } from "@lib/mock/db"

export const retrieveVariant = async (
  variant_id: string
): Promise<HttpTypes.StoreProductVariant | null> => {
  for (const product of listAllProducts()) {
    const variant = product.variants?.find((v) => v.id === variant_id)
    if (variant) return variant
  }
  return null
}

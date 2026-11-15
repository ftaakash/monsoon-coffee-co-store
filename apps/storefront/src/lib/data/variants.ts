"use server"

import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"

export const retrieveVariant = async (
  variant_id: string
): Promise<HttpTypes.StoreProductVariant | null> =>
  storeApi<{ variant: HttpTypes.StoreProductVariant }>(`/variants/${variant_id}`)
    .then((r) => r.variant)
    .catch(() => null)

"use server"

import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"

export const listCartPaymentMethods = async (_regionId: string) =>
  (await storeApi<{ payment_providers: HttpTypes.StorePaymentProvider[] }>("/payment-providers"))
    .payment_providers.sort((a, b) => (a.id > b.id ? 1 : -1))

"use server"

import { PAYMENT_PROVIDERS } from "@lib/mock/catalog"

export const listCartPaymentMethods = async (_regionId: string) =>
  [...PAYMENT_PROVIDERS].sort((a, b) => (a.id > b.id ? 1 : -1))

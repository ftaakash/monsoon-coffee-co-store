"use server"

import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"
import { revalidateStorefront } from "./revalidate"

type OrderResponse = { order: HttpTypes.StoreOrder }

export const retrieveOrder = async (id: string) =>
  (await storeApi<OrderResponse>(`/orders/${id}`)).order

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  _filters?: Record<string, unknown>
) =>
  (
    await storeApi<{ orders: HttpTypes.StoreOrder[] }>("/customers/me/orders", {
      query: { limit, offset },
    })
  ).orders

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  try {
    const { order } = await storeApi<OrderResponse>(`/orders/${id}/transfer`, { method: "POST" })
    return { success: true, error: null, order }
  } catch (err) {
    return { success: false, error: (err as Error).message, order: null }
  }
}

export const acceptTransferRequest = async (id: string, _token: string) => {
  try {
    const { order } = await storeApi<OrderResponse>(`/orders/${id}/transfer/accept`, { method: "POST" })
    revalidateStorefront()
    return { success: true, error: null, order }
  } catch (err) {
    return { success: false, error: (err as Error).message, order: null }
  }
}

export const cancelOrder = async (
  id: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    await storeApi(`/orders/${id}/cancel`, { method: "POST" })
    revalidateStorefront()
    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to cancel order",
    }
  }
}

export const requestOrderRefund = async (
  id: string,
  note?: string
): Promise<{ success: boolean; error: string | null }> => {
  try {
    await storeApi(`/orders/${id}/refund-request`, { method: "POST", body: { note } })
    revalidateStorefront()
    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to refund order",
    }
  }
}

export const declineTransferRequest = async (id: string, _token: string) => {
  try {
    const { order } = await storeApi<OrderResponse>(`/orders/${id}/transfer/decline`, { method: "POST" })
    return { success: true, error: null, order }
  } catch (err) {
    return { success: false, error: (err as Error).message, order: null }
  }
}

"use server"

import { HttpTypes } from "@medusajs/types"
import { mockOrders } from "@lib/mock/db"
import { getCustomerId } from "./cookies"
import { revalidateStorefront } from "./revalidate"

export const retrieveOrder = async (id: string) => mockOrders.retrieve(id)

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  _filters?: Record<string, unknown>
) => {
  const customerId = await getCustomerId()
  if (!customerId) throw new Error("Unauthorized")
  return mockOrders.listForCustomer(customerId, limit, offset)
}

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
    return { success: true, error: null, order: mockOrders.requestTransfer(id) }
  } catch (err) {
    return { success: false, error: (err as Error).message, order: null }
  }
}

export const acceptTransferRequest = async (id: string, _token: string) => {
  try {
    const order = mockOrders.acceptTransfer(id, await getCustomerId())
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
    mockOrders.cancel(id, await getCustomerId())
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
    mockOrders.requestRefund(id, await getCustomerId(), note)
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
    return { success: true, error: null, order: mockOrders.declineTransfer(id) }
  } catch (err) {
    return { success: false, error: (err as Error).message, order: null }
  }
}

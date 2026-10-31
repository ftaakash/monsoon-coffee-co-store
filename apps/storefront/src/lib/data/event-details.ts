"use server"

import { EVENT_DETAILS } from "@lib/mock/catalog"

export type EventDetail = {
  id: string
  product_id: string
  partner?: string | null
  venue?: string | null
  city?: string | null
  date_label?: string | null
  event_date?: string | null
  start_time?: string | null
  end_time?: string | null
  seats_total?: number | null
  booking_closed?: boolean | null
  description?: string | null
  highlights?: string[] | null
  images?: string[] | null
}

export async function getProductEventDetail(
  productId: string
): Promise<EventDetail | null> {
  return EVENT_DETAILS[productId] ?? null
}

import "server-only"

import crypto from "node:crypto"

import { getDb, newId, now, parseJson, toJson } from "../db"
import { badRequest, conflict, notFound, unauthorized } from "../errors"
import { findVariant, REGIONS } from "./catalog"
import type { HydratedCart } from "./carts"

type OrderRow = {
  id: string
  display_id: number
  customer_id: string | null
  email: string
  status: string
  fulfillment_status: string
  payment_status: string
  region_id: string
  currency_code: string
  shipping_address_json: string | null
  billing_address_json: string | null
  shipping_methods_json: string
  promotions_json: string
  fulfillments_json: string
  metadata_json: string
  subtotal: number
  discount_total: number
  shipping_total: number
  tax_total: number
  total: number
  canceled_at: string | null
  created_at: string
  updated_at: string
}

type OrderItemRow = {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  product_title: string
  product_handle: string | null
  variant_title: string | null
  thumbnail: string | null
  is_digital: number
  quantity: number
  unit_price: number
  total: number
  created_at: string
}

type Fulfillment = Record<string, any>

// Order lines come from the stored snapshot; the live product is attached when
// it still exists so the UI can link back to it.
function hydrateItem(item: OrderItemRow, currency: string) {
  const live = item.variant_id ? findVariant(item.variant_id) : null
  return {
    id: item.id,
    title: item.variant_title ?? item.product_title,
    product_title: item.product_title,
    product_handle: item.product_handle,
    product_id: item.product_id,
    variant_id: item.variant_id,
    variant_title: item.variant_title,
    thumbnail: item.thumbnail,
    quantity: item.quantity,
    unit_price: item.unit_price,
    subtotal: item.total,
    item_subtotal: item.total,
    item_total: item.total,
    total: item.total,
    original_total: item.total,
    discount_total: 0,
    tax_total: 0,
    currency_code: currency,
    requires_shipping: !item.is_digital,
    metadata: {},
    created_at: item.created_at,
    product: live?.product ?? { id: item.product_id, handle: item.product_handle, shipping_profile: { id: item.is_digital ? "sp_digital" : "sp_physical" } },
    variant: live ? { ...live.variant, product: live.product } : null,
  }
}

function hydrateOrder(row: OrderRow) {
  const items = (
    getDb().prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at, id").all(row.id) as OrderItemRow[]
  ).map((i) => hydrateItem(i, row.currency_code))

  return {
    id: row.id,
    display_id: row.display_id,
    status: row.status,
    fulfillment_status: row.fulfillment_status,
    payment_status: row.payment_status,
    email: row.email,
    customer_id: row.customer_id,
    region_id: row.region_id,
    region: REGIONS.find((r) => r.id === row.region_id) ?? null,
    currency_code: row.currency_code,
    items,
    shipping_address: parseJson<Record<string, any> | null>(row.shipping_address_json, null),
    billing_address: parseJson<Record<string, any> | null>(row.billing_address_json, null),
    shipping_methods: parseJson<unknown[]>(row.shipping_methods_json, []),
    promotions: parseJson<unknown[]>(row.promotions_json, []),
    payment_collections: [
      {
        id: `paycol_${row.id}`,
        status: row.payment_status,
        amount: row.total,
        payments: [
          {
            id: `pay_${row.id}`,
            provider_id: "pp_razorpay_razorpay",
            amount: row.total,
            currency_code: row.currency_code,
            created_at: row.created_at,
            captured_at: row.created_at,
            data: {},
          },
        ],
      },
    ],
    fulfillments: parseJson<Fulfillment[]>(row.fulfillments_json, []),
    item_subtotal: row.subtotal,
    item_total: row.subtotal - row.discount_total,
    subtotal: row.subtotal,
    discount_total: row.discount_total,
    shipping_total: row.shipping_total,
    shipping_subtotal: row.shipping_total,
    tax_total: row.tax_total,
    gift_card_total: 0,
    original_total: row.subtotal + row.shipping_total,
    total: row.total,
    canceled_at: row.canceled_at,
    metadata: parseJson<Record<string, unknown>>(row.metadata_json, {}),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

export type HydratedOrder = ReturnType<typeof hydrateOrder>

const ticketCode = () => `MCC-${crypto.randomBytes(3).toString("hex").toUpperCase()}`

/** Writes the order and its line snapshot. Called inside completeCart's transaction. */
export function createOrderFromCart(cart: HydratedCart) {
  const db = getDb()
  const id = newId("order")
  const ts = now()
  const { next } = db
    .prepare("SELECT COALESCE(MAX(display_id), 1000) + 1 AS next FROM orders")
    .get() as { next: number }

  const isDigital = (i: HydratedCart["items"][number]) => i.product?.shipping_profile.id === "sp_digital"
  const tickets = cart.items.filter(isDigital)

  // Event tickets are "delivered" the moment the order is placed: one QR code
  // per seat, shown on the order page.
  const fulfillments: Fulfillment[] = tickets.length
    ? [
        {
          id: newId("ful"),
          provider_id: "manual_manual",
          created_at: ts,
          shipped_at: ts,
          delivered_at: ts,
          canceled_at: null,
          labels: [],
          data: {},
          metadata: {
            type: "digital",
            tickets: tickets.flatMap((i) =>
              Array.from({ length: i.quantity }, (_, n) => ({
                title: i.product_title,
                code: ticketCode(),
                unit: n + 1,
              }))
            ),
          },
        },
      ]
    : []

  db.prepare(
    `INSERT INTO orders (id, display_id, customer_id, email, status, fulfillment_status, payment_status,
       region_id, currency_code, shipping_address_json, billing_address_json, shipping_methods_json,
       promotions_json, fulfillments_json, metadata_json, subtotal, discount_total, shipping_total,
       tax_total, total, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'pending', ?, 'captured', ?, ?, ?, ?, ?, ?, ?, '{}', ?, ?, ?, 0, ?, ?, ?)`
  ).run(
    id,
    next,
    cart.customer_id,
    cart.email,
    !tickets.length ? "not_fulfilled" : tickets.length === cart.items.length ? "fulfilled" : "partially_fulfilled",
    cart.region_id,
    cart.currency_code,
    toJson(cart.shipping_address),
    toJson(cart.billing_address),
    JSON.stringify(cart.shipping_methods),
    JSON.stringify(cart.promotions),
    JSON.stringify(fulfillments),
    cart.subtotal,
    cart.discount_total,
    cart.shipping_total,
    cart.total,
    ts,
    ts
  )

  const insertItem = db.prepare(
    `INSERT INTO order_items (id, order_id, product_id, variant_id, product_title, product_handle,
       variant_title, thumbnail, is_digital, quantity, unit_price, total, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const i of cart.items) {
    insertItem.run(
      newId("ordli"),
      id,
      i.product_id,
      i.variant_id,
      i.product_title,
      i.product_handle,
      i.variant_title,
      i.thumbnail,
      isDigital(i) ? 1 : 0,
      i.quantity,
      i.unit_price,
      i.total,
      ts
    )
  }

  return retrieveOrder(id)
}

function getOrderRow(orderId: string) {
  const row = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as OrderRow | undefined
  if (!row) throw notFound("Order not found")
  return row
}

// The confirmation page is reachable by order id, because guests check out too.
// Ids are long random strings, so they work like an unguessable link.
export const retrieveOrder = (orderId: string) => hydrateOrder(getOrderRow(orderId))

export function listCustomerOrders(customerId: string, limit = 10, offset = 0) {
  const rows = getDb()
    .prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?")
    .all(customerId, limit, offset) as OrderRow[]
  return rows.map(hydrateOrder)
}

function ownedOrderRow(orderId: string, customerId: string | null) {
  if (!customerId) throw unauthorized()
  const row = getOrderRow(orderId)
  if (row.customer_id !== customerId) throw notFound("Order not found")
  return row
}

const restock = (orderId: string) => {
  const db = getDb()
  const items = db.prepare("SELECT variant_id, quantity FROM order_items WHERE order_id = ?").all(orderId) as {
    variant_id: string | null
    quantity: number
  }[]
  const update = db.prepare("UPDATE variants SET stock = stock + ? WHERE id = ? AND manage_inventory = 1")
  for (const i of items) if (i.variant_id) update.run(i.quantity, i.variant_id)
}

function cancel(row: OrderRow) {
  if (row.canceled_at) throw conflict("Order is already canceled")
  if (!["not_fulfilled", "fulfilled", "partially_fulfilled"].includes(row.fulfillment_status)) {
    throw conflict("Shipped orders can't be canceled")
  }
  getDb().transaction(() => {
    restock(row.id)
    getDb()
      .prepare("UPDATE orders SET status = 'canceled', canceled_at = ?, updated_at = ? WHERE id = ?")
      .run(now(), now(), row.id)
  })()
  return retrieveOrder(row.id)
}

export const cancelCustomerOrder = (orderId: string, customerId: string | null) =>
  cancel(ownedOrderRow(orderId, customerId))

export function requestRefund(orderId: string, customerId: string | null, note?: string) {
  const row = ownedOrderRow(orderId, customerId)
  if (row.fulfillment_status !== "delivered") throw conflict("Only delivered orders can be refunded")
  const metadata = { ...parseJson(row.metadata_json, {}), refund_requested_at: now(), refund_note: note ?? null }
  getDb()
    .prepare("UPDATE orders SET metadata_json = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(metadata), now(), orderId)
  return retrieveOrder(orderId)
}

// Order transfer: a guest order can be claimed by a signed-in account.
export function requestTransfer(orderId: string) {
  const row = getOrderRow(orderId)
  return { id: row.id, email: row.email }
}

export function acceptTransfer(orderId: string, customerId: string | null) {
  if (!customerId) throw unauthorized("Sign in to accept this transfer")
  getOrderRow(orderId)
  getDb().prepare("UPDATE orders SET customer_id = ?, updated_at = ? WHERE id = ?").run(customerId, now(), orderId)
  return retrieveOrder(orderId)
}

// ── Admin ─────────────────────────────────────────────────────────────────

export function listAllOrders(filter: { status?: string; q?: string; limit?: number; offset?: number } = {}) {
  const where: string[] = []
  const params: unknown[] = []
  if (filter.status === "canceled") where.push("canceled_at IS NOT NULL")
  else if (filter.status) {
    where.push("fulfillment_status = ? AND canceled_at IS NULL")
    params.push(filter.status)
  }
  if (filter.q?.trim()) {
    where.push("(email LIKE ? OR CAST(display_id AS TEXT) = ?)")
    params.push(`%${filter.q.trim()}%`, filter.q.trim().replace(/^#/, ""))
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const db = getDb()
  const { count } = db.prepare(`SELECT COUNT(*) AS count FROM orders ${whereSql}`).get(...params) as { count: number }
  const rows = db
    .prepare(`SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, filter.limit ?? 50, filter.offset ?? 0) as OrderRow[]
  return { orders: rows.map(hydrateOrder), count }
}

const COURIER_STATUS: Record<string, string> = {
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
}

/**
 * Moves a physical order along: shipped → out_for_delivery → delivered, or
 * cancels it. The courier fulfillment is written in the same shape the
 * tracking timeline on the order page reads.
 */
export function advanceOrder(orderId: string, action: "shipped" | "out_for_delivery" | "delivered" | "canceled") {
  const row = getOrderRow(orderId)
  if (action === "canceled") return cancel(row)
  if (row.canceled_at) throw conflict("Order is canceled")

  const rank: Record<string, number> = { not_fulfilled: 0, partially_fulfilled: 0, fulfilled: 0, shipped: 1, out_for_delivery: 2, delivered: 3 }
  if (!(action in COURIER_STATUS)) throw badRequest("Unknown action")
  if (row.fulfillment_status === "fulfilled") throw conflict("Ticket-only orders have nothing to ship")
  if (rank[action] <= (rank[row.fulfillment_status] ?? 0)) {
    throw conflict(`Order is already ${row.fulfillment_status.replace(/_/g, " ")}`)
  }

  const ts = now()
  const fulfillments = parseJson<Fulfillment[]>(row.fulfillments_json, [])
  let courier = fulfillments.find((f) => f.metadata?.type !== "digital")
  if (!courier) {
    const awb = `MCC${Date.now().toString().slice(-10)}`
    courier = {
      id: newId("ful"),
      provider_id: "manual_manual",
      created_at: ts,
      packed_at: ts,
      shipped_at: null,
      delivered_at: null,
      canceled_at: null,
      labels: [{ tracking_number: awb, tracking_url: null }],
      data: { shipmozo: { awb_number: awb, courier: "Demo Couriers" } },
      metadata: {},
    }
    fulfillments.push(courier)
  }
  courier.shipped_at = courier.shipped_at ?? ts
  if (action === "delivered") courier.delivered_at = ts
  courier.data = {
    ...courier.data,
    shipmozo: { ...courier.data?.shipmozo, current_status: COURIER_STATUS[action], status_time: ts },
  }

  getDb()
    .prepare(
      `UPDATE orders SET fulfillment_status = ?, status = ?, fulfillments_json = ?, updated_at = ? WHERE id = ?`
    )
    .run(action, action === "delivered" ? "completed" : "pending", JSON.stringify(fulfillments), ts, orderId)
  return retrieveOrder(orderId)
}

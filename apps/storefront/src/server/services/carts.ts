import "server-only"

import { getDb, newId, now, parseJson, toJson } from "../db"
import { badRequest, conflict, notFound } from "../errors"
import {
  availableUnits,
  CURRENCY,
  findVariant,
  listShippingOptions,
  promoPercent,
  REGIONS,
} from "./catalog"
import { createOrderFromCart } from "./orders"

type CartRow = {
  id: string
  region_id: string
  customer_id: string | null
  email: string | null
  shipping_address_json: string | null
  billing_address_json: string | null
  shipping_option_ids_json: string
  promo_codes_json: string
  payment_session_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type CartItemRow = {
  id: string
  cart_id: string
  variant_id: string
  quantity: number
  created_at: string
}

function hydrateItem(item: CartItemRow) {
  const found = findVariant(item.variant_id)
  const product = found?.product
  const variant = found?.variant
  const unitPrice = variant?.calculated_price.calculated_amount ?? 0
  const originalUnit = variant?.calculated_price.original_amount ?? unitPrice
  const total = unitPrice * item.quantity

  return {
    id: item.id,
    title: variant?.title ?? "Item",
    subtitle: product?.subtitle ?? null,
    product_title: product?.title ?? "Item",
    product_subtitle: product?.subtitle ?? null,
    product_handle: product?.handle ?? "",
    product_id: product?.id ?? null,
    variant_id: item.variant_id,
    variant_title: variant?.title ?? null,
    variant_sku: variant?.sku ?? null,
    thumbnail: product?.thumbnail ?? null,
    quantity: item.quantity,
    unit_price: unitPrice,
    compare_at_unit_price: originalUnit > unitPrice ? originalUnit : null,
    subtotal: total,
    item_subtotal: total,
    item_total: total,
    total,
    original_total: originalUnit * item.quantity,
    discount_total: 0,
    tax_total: 0,
    requires_shipping: product?.shipping_profile.id !== "sp_digital",
    is_discountable: true,
    metadata: {},
    currency_code: CURRENCY,
    created_at: item.created_at,
    product: product ?? null,
    variant: variant ? { ...variant, product } : null,
  }
}

export type HydratedCartItem = ReturnType<typeof hydrateItem>

/**
 * Every total in the store comes from this one function, so the cart,
 * checkout, order and receipt can never disagree. Amounts are whole rupees.
 */
export function computeTotals(
  items: { total: number }[],
  shippingOptionIds: string[],
  promoCodes: string[]
) {
  const itemSubtotal = items.reduce((sum, i) => sum + i.total, 0)
  const percent = promoCodes.reduce((sum, c) => sum + (promoPercent(c) ?? 0), 0)
  const discountTotal = Math.round((itemSubtotal * Math.min(percent, 100)) / 100)
  const options = listShippingOptions()
  const shippingTotal = shippingOptionIds.reduce(
    (sum, id) => sum + (options.find((o) => o.id === id)?.amount ?? 0),
    0
  )
  const total = itemSubtotal - discountTotal + shippingTotal

  return {
    item_subtotal: itemSubtotal,
    item_total: itemSubtotal - discountTotal,
    subtotal: itemSubtotal,
    discount_total: discountTotal,
    discount_subtotal: discountTotal,
    shipping_total: shippingTotal,
    shipping_subtotal: shippingTotal,
    original_shipping_total: shippingTotal,
    tax_total: 0,
    item_tax_total: 0,
    shipping_tax_total: 0,
    gift_card_total: 0,
    original_total: itemSubtotal + shippingTotal,
    total,
  }
}

const shippingMethodsFor = (optionIds: string[], ownerId: string) => {
  const options = listShippingOptions()
  return optionIds
    .map((id) => options.find((o) => o.id === id))
    .filter((o): o is NonNullable<typeof o> => !!o)
    .map((o) => ({
      id: `sm_${ownerId}_${o.id}`,
      name: o.name,
      description: o.data.description,
      shipping_option_id: o.id,
      amount: o.amount,
      subtotal: o.amount,
      total: o.amount,
      data: {},
    }))
}

const promotionsFor = (codes: string[]) =>
  codes.map((code) => ({
    id: `promo_${code}`,
    code,
    is_automatic: false,
    application_method: { type: "percentage", value: promoPercent(code), currency_code: CURRENCY },
  }))

function hydrateCart(row: CartRow) {
  const region = REGIONS.find((r) => r.id === row.region_id) ?? REGIONS[0]
  const itemRows = getDb()
    .prepare("SELECT * FROM cart_items WHERE cart_id = ? ORDER BY created_at")
    .all(row.id) as CartItemRow[]
  const items = itemRows.map(hydrateItem)
  const shippingOptionIds = parseJson<string[]>(row.shipping_option_ids_json, [])
  const promoCodes = parseJson<string[]>(row.promo_codes_json, [])
  const totals = computeTotals(items, shippingOptionIds, promoCodes)

  return {
    id: row.id,
    region_id: region.id,
    region,
    currency_code: region.currency_code,
    customer_id: row.customer_id,
    email: row.email,
    items,
    shipping_address: parseJson<Record<string, unknown> | null>(row.shipping_address_json, null),
    billing_address: parseJson<Record<string, unknown> | null>(row.billing_address_json, null),
    shipping_methods: shippingMethodsFor(shippingOptionIds, row.id),
    promotions: promotionsFor(promoCodes),
    payment_collection: row.payment_session_id
      ? {
          id: `paycol_${row.id}`,
          amount: totals.total,
          currency_code: region.currency_code,
          status: "not_paid",
          payment_sessions: [
            {
              id: row.payment_session_id,
              provider_id: "pp_razorpay_razorpay",
              status: "pending",
              amount: totals.total,
              currency_code: region.currency_code,
              data: {},
            },
          ],
        }
      : null,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    metadata: {},
    ...totals,
  }
}

export type HydratedCart = ReturnType<typeof hydrateCart>

function getCartRow(cartId: string) {
  const row = getDb().prepare("SELECT * FROM carts WHERE id = ?").get(cartId) as CartRow | undefined
  if (!row) throw notFound("Cart not found")
  return row
}

function openCartRow(cartId: string) {
  const row = getCartRow(cartId)
  if (row.completed_at) throw conflict("Cart is already completed")
  return row
}

// Any change to the cart invalidates the payment session priced against the
// old contents, like Medusa does.
const touch = (cartId: string, extraSql = "", ...params: unknown[]) =>
  getDb()
    .prepare(
      `UPDATE carts SET payment_session_id = NULL, updated_at = ?${extraSql ? ", " + extraSql : ""} WHERE id = ?`
    )
    .run(now(), ...params, cartId)

export function retrieveCart(cartId: string) {
  const row = getDb().prepare("SELECT * FROM carts WHERE id = ?").get(cartId) as CartRow | undefined
  return row ? hydrateCart(row) : null
}

export function createCart(input: { region_id?: string; customer_id?: string | null; email?: string | null }) {
  const id = newId("cart")
  const ts = now()
  let email = input.email ?? null
  if (!email && input.customer_id) {
    email =
      (getDb().prepare("SELECT email FROM customers WHERE id = ?").get(input.customer_id) as
        | { email: string }
        | undefined)?.email ?? null
  }
  getDb()
    .prepare(
      `INSERT INTO carts (id, region_id, customer_id, email, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, input.region_id || REGIONS[0].id, input.customer_id ?? null, email, ts, ts)
  return retrieveCart(id)!
}

export function updateCart(
  cartId: string,
  data: {
    email?: string | null
    region_id?: string
    shipping_address?: Record<string, unknown>
    billing_address?: Record<string, unknown>
    promo_codes?: string[]
  }
) {
  const row = openCartRow(cartId)
  const sets: string[] = []
  const params: unknown[] = []
  const set = (col: string, value: unknown) => {
    sets.push(`${col} = ?`)
    params.push(value)
  }

  if (data.email !== undefined) {
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) throw badRequest("Enter a valid email address")
    set("email", data.email)
  }
  if (data.region_id) {
    if (!REGIONS.some((r) => r.id === data.region_id)) throw badRequest("Unknown region")
    set("region_id", data.region_id)
  }
  if (data.shipping_address) set("shipping_address_json", toJson({ id: newId("caaddr"), ...data.shipping_address }))
  if (data.billing_address) set("billing_address_json", toJson({ id: newId("caaddr"), ...data.billing_address }))
  if (data.promo_codes) {
    const codes = data.promo_codes.map((c) => (c ?? "").trim().toUpperCase()).filter(Boolean)
    const unknown = codes.find((c) => promoPercent(c) === null)
    if (unknown) throw badRequest(`The promotion code ${unknown} is invalid. Try MONSOON10.`)
    const merged = Array.from(new Set([...parseJson<string[]>(row.promo_codes_json, []), ...codes]))
    set("promo_codes_json", JSON.stringify(merged))
  }

  touch(cartId, sets.join(", "), ...params)
  return retrieveCart(cartId)!
}

export function addLineItem(cartId: string, variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) throw badRequest("Quantity must be at least 1")
  openCartRow(cartId)
  const found = findVariant(variantId)
  if (!found || found.product.status !== "published") throw notFound("Variant not found")

  const db = getDb()
  const existing = db
    .prepare("SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?")
    .get(cartId, variantId) as CartItemRow | undefined
  const nextQty = (existing?.quantity ?? 0) + quantity
  // The UI already stops at the stock limit, but the client can't be trusted.
  if (nextQty > availableUnits(found.variant)) {
    throw conflict("Variant does not have the required inventory")
  }

  if (existing) {
    db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(nextQty, existing.id)
  } else {
    db.prepare(
      "INSERT INTO cart_items (id, cart_id, variant_id, quantity, created_at) VALUES (?, ?, ?, ?, ?)"
    ).run(newId("item"), cartId, variantId, quantity, now())
  }
  touch(cartId)
  return retrieveCart(cartId)!
}

export function updateLineItem(cartId: string, lineId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 0) throw badRequest("Invalid quantity")
  openCartRow(cartId)
  if (quantity === 0) return deleteLineItem(cartId, lineId)

  const item = getDb()
    .prepare("SELECT * FROM cart_items WHERE id = ? AND cart_id = ?")
    .get(lineId, cartId) as CartItemRow | undefined
  if (!item) throw notFound("Line item not found")
  const found = findVariant(item.variant_id)
  if (found && quantity > availableUnits(found.variant)) {
    throw conflict("Variant does not have the required inventory")
  }
  getDb().prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(quantity, lineId)
  touch(cartId)
  return retrieveCart(cartId)!
}

export function deleteLineItem(cartId: string, lineId: string) {
  openCartRow(cartId)
  getDb().prepare("DELETE FROM cart_items WHERE id = ? AND cart_id = ?").run(lineId, cartId)
  touch(cartId)
  return retrieveCart(cartId)!
}

/** Shipping options that apply to something in the cart (courier and/or ticket). */
export function listCartShippingOptions(cartId: string) {
  const cart = retrieveCart(cartId)
  if (!cart) throw notFound("Cart not found")
  const profiles = new Set(cart.items.map((i) => i.product?.shipping_profile.id))
  return listShippingOptions().filter((o) => profiles.has(o.shipping_profile_id))
}

export function setShippingMethods(cartId: string, optionIds: string[]) {
  openCartRow(cartId)
  const valid = listShippingOptions().map((o) => o.id)
  const ids = Array.from(new Set(optionIds.filter((id) => valid.includes(id))))
  touch(cartId, "shipping_option_ids_json = ?", JSON.stringify(ids))
  return retrieveCart(cartId)!
}

export function initPaymentSession(cartId: string) {
  openCartRow(cartId)
  getDb()
    .prepare("UPDATE carts SET payment_session_id = ?, updated_at = ? WHERE id = ?")
    .run(newId("payses"), now(), cartId)
  return retrieveCart(cartId)!
}

/** Attaches a guest cart to the customer who just signed in. */
export function transferCart(cartId: string, customerId: string) {
  const row = getCartRow(cartId)
  if (row.completed_at) return retrieveCart(cartId)!
  const customer = getDb().prepare("SELECT email FROM customers WHERE id = ?").get(customerId) as
    | { email: string }
    | undefined
  if (!customer) throw notFound("Customer not found")
  getDb()
    .prepare("UPDATE carts SET customer_id = ?, email = COALESCE(email, ?), updated_at = ? WHERE id = ?")
    .run(customerId, customer.email, now(), cartId)
  return retrieveCart(cartId)!
}

/**
 * Turns the cart into an order. Runs in one transaction: either stock is
 * reserved, the order is written and the cart is closed, or nothing changes.
 */
export function completeCart(cartId: string) {
  const db = getDb()
  return db.transaction(() => {
    const row = openCartRow(cartId)
    const cart = hydrateCart(row)
    if (!cart.items.length) throw badRequest("Cart is empty")
    if (!cart.email) throw badRequest("Email is required")
    if (!cart.shipping_address?.address_1) throw badRequest("Shipping address is required")
    if (!row.payment_session_id) throw badRequest("Payment session missing")

    // The WHERE stock >= ? guard means two shoppers can't both buy the last bag.
    const reserve = db.prepare(
      "UPDATE variants SET stock = stock - ? WHERE id = ? AND manage_inventory = 1 AND stock >= ?"
    )
    for (const item of cart.items) {
      if (!item.variant?.manage_inventory) continue
      const res = reserve.run(item.quantity, item.variant_id, item.quantity)
      if (res.changes === 0) throw conflict(`${item.product_title} does not have the required inventory`)
    }

    const order = createOrderFromCart(cart)
    db.prepare("UPDATE carts SET completed_at = ?, updated_at = ? WHERE id = ?").run(now(), now(), cartId)
    return { type: "order" as const, order }
  })()
}

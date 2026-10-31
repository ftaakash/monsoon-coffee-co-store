import "server-only"

import { HttpTypes } from "@medusajs/types"

import type { Review } from "@lib/data/reviews"
import {
  PRODUCTS,
  PROMO_CODES,
  REGIONS,
  SEED_REVIEWS,
  SHIPPING_OPTIONS,
} from "./catalog"

// In-memory stand-in for the Medusa backend. State lives on globalThis so it
// survives hot reloads in `next dev`, and resets when the server restarts.
// Cookies only ever hold opaque ids (cart id, session token) that point here.

type Address = Record<string, any> & { id: string }

type CustomerRecord = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  password: string | null
  addresses: Address[]
  created_at: string
}

type LineItem = {
  id: string
  variant_id: string
  quantity: number
  created_at: string
}

type CartRecord = {
  id: string
  region_id: string
  customer_id: string | null
  email: string | null
  items: LineItem[]
  shipping_address: Record<string, any> | null
  billing_address: Record<string, any> | null
  shipping_option_ids: string[]
  promo_codes: string[]
  payment_session: { id: string; status: "pending" } | null
  completed_at: string | null
  created_at: string
}

type OrderRecord = Record<string, any> & {
  id: string
  customer_id: string | null
  email: string
}

type MockDb = {
  customers: Map<string, CustomerRecord>
  sessions: Map<string, string>
  carts: Map<string, CartRecord>
  orders: Map<string, OrderRecord>
  reviews: Review[]
  // variant id → units left (only for inventory-managed variants)
  stock: Map<string, number>
  nextDisplayId: number
}

export class MockError extends Error {}

const now = () => new Date().toISOString()
const uid = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`

declare global {
  // eslint-disable-next-line no-var
  var __monsoonMockDb: MockDb | undefined
}

export const DEMO_CUSTOMER = {
  email: "demo@monsoon.test",
  password: "monsoon123",
}

// One-time passcode accepted for every OTP prompt (login, set password).
export const DEMO_OTP = "123456"

function createDb(): MockDb {
  const db: MockDb = {
    customers: new Map(),
    sessions: new Map(),
    carts: new Map(),
    orders: new Map(),
    reviews: [...SEED_REVIEWS],
    stock: new Map(),
    nextDisplayId: 1001,
  }

  for (const product of PRODUCTS) {
    for (const v of product.variants ?? []) {
      if (v.manage_inventory) db.stock.set(v.id, v.inventory_quantity ?? 0)
    }
  }

  const demo: CustomerRecord = {
    id: "cus_demo",
    email: DEMO_CUSTOMER.email,
    first_name: "Asha",
    last_name: "Menon",
    phone: "9876543210",
    password: DEMO_CUSTOMER.password,
    created_at: "2025-01-15T10:00:00.000Z",
    addresses: [
      {
        id: "addr_demo",
        first_name: "Asha",
        last_name: "Menon",
        company: "",
        address_1: "12, 4th Cross, Indiranagar",
        address_2: "",
        city: "Bengaluru",
        province: "Karnataka",
        postal_code: "560038",
        country_code: "in",
        phone: "9876543210",
        is_default_shipping: true,
        is_default_billing: true,
      },
    ],
  }
  db.customers.set(demo.id, demo)

  return db
}

export function getDb(): MockDb {
  if (!globalThis.__monsoonMockDb) {
    globalThis.__monsoonMockDb = createDb()
    seedDemoOrder(globalThis.__monsoonMockDb)
  }
  return globalThis.__monsoonMockDb
}

// ── Catalogue lookups ──────────────────────────────────────────────────────

const withLiveStock = (product: HttpTypes.StoreProduct, db: MockDb) =>
  ({
    ...product,
    variants: product.variants?.map((v) =>
      v.manage_inventory
        ? { ...v, inventory_quantity: db.stock.get(v.id) ?? 0 }
        : v
    ),
  }) as HttpTypes.StoreProduct

export function listAllProducts(): HttpTypes.StoreProduct[] {
  const db = getDb()
  return PRODUCTS.map((p) => withLiveStock(p, db))
}

function findVariant(variantId: string) {
  for (const product of listAllProducts()) {
    const variant = product.variants?.find((v) => v.id === variantId)
    if (variant) return { product, variant }
  }
  return null
}

const availableUnits = (variant: HttpTypes.StoreProductVariant) =>
  variant.manage_inventory ? variant.inventory_quantity ?? 0 : Infinity

// ── Carts ──────────────────────────────────────────────────────────────────

function hydrateItem(item: LineItem, currency: string) {
  const found = findVariant(item.variant_id)
  const product = found?.product
  const variant = found?.variant as any
  const unitPrice = variant?.calculated_price?.calculated_amount ?? 0
  const originalUnit = variant?.calculated_price?.original_amount ?? unitPrice
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
    requires_shipping: true,
    is_discountable: true,
    metadata: {},
    currency_code: currency,
    created_at: item.created_at,
    product: product
      ? {
          ...product,
          shipping_profile: (product as any).shipping_profile,
        }
      : null,
    variant: variant ? { ...variant, product } : null,
  }
}

function computeTotals(
  items: ReturnType<typeof hydrateItem>[],
  shippingOptionIds: string[],
  promoCodes: string[]
) {
  const itemSubtotal = items.reduce((sum, i) => sum + i.total, 0)
  const percent = promoCodes.reduce((sum, c) => sum + (PROMO_CODES[c] ?? 0), 0)
  const discountTotal = Math.round((itemSubtotal * Math.min(percent, 100)) / 100)
  const shippingTotal = shippingOptionIds.reduce((sum, id) => {
    const option = SHIPPING_OPTIONS.find((o) => o.id === id)
    return sum + (option?.amount ?? 0)
  }, 0)
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

const shippingMethodsFor = (optionIds: string[], ownerId: string) =>
  optionIds
    .map((id) => SHIPPING_OPTIONS.find((o) => o.id === id))
    .filter((o): o is HttpTypes.StoreCartShippingOption => !!o)
    .map((o) => ({
      id: `sm_${ownerId}_${o.id}`,
      name: o.name,
      description: (o as any).data?.description ?? null,
      shipping_option_id: o.id,
      amount: o.amount,
      subtotal: o.amount,
      total: o.amount,
      data: {},
    }))

const promotionsFor = (codes: string[]) =>
  codes.map((code) => ({
    id: `promo_${code}`,
    code,
    is_automatic: false,
    application_method: {
      type: "percentage",
      value: PROMO_CODES[code],
      currency_code: "inr",
    },
  }))

function hydrateCart(record: CartRecord): HttpTypes.StoreCart {
  const region = REGIONS.find((r) => r.id === record.region_id) ?? REGIONS[0]
  const currency = region.currency_code ?? "inr"
  const items = record.items.map((i) => hydrateItem(i, currency))
  const totals = computeTotals(
    items,
    record.shipping_option_ids,
    record.promo_codes
  )

  return {
    id: record.id,
    region_id: region.id,
    region,
    currency_code: currency,
    customer_id: record.customer_id,
    email: record.email,
    items,
    shipping_address: record.shipping_address,
    billing_address: record.billing_address,
    shipping_methods: shippingMethodsFor(record.shipping_option_ids, record.id),
    promotions: promotionsFor(record.promo_codes),
    payment_collection: record.payment_session
      ? {
          id: `paycol_${record.id}`,
          amount: totals.total,
          currency_code: currency,
          status: "not_paid",
          payment_sessions: [
            {
              id: record.payment_session.id,
              provider_id: "pp_razorpay_razorpay",
              status: record.payment_session.status,
              amount: totals.total,
              currency_code: currency,
              data: { mock: true, amount: totals.total * 100, currency },
            },
          ],
        }
      : null,
    completed_at: record.completed_at,
    created_at: record.created_at,
    updated_at: now(),
    metadata: {},
    ...totals,
  } as unknown as HttpTypes.StoreCart
}

function getCartRecord(cartId: string) {
  const record = getDb().carts.get(cartId)
  if (!record) throw new MockError("Cart not found")
  return record
}

// Any cart change invalidates the shipping methods and payment session that
// were priced against the old contents, like Medusa does.
const touchCart = (record: CartRecord) => {
  record.payment_session = null
}

export const mockCart = {
  retrieve(cartId: string) {
    const record = getDb().carts.get(cartId)
    return record ? hydrateCart(record) : null
  },

  create(regionId: string, customerId: string | null, email?: string | null) {
    const record: CartRecord = {
      id: uid("cart"),
      region_id: regionId,
      customer_id: customerId,
      email: email ?? null,
      items: [],
      shipping_address: null,
      billing_address: null,
      shipping_option_ids: [],
      promo_codes: [],
      payment_session: null,
      completed_at: null,
      created_at: now(),
    }
    getDb().carts.set(record.id, record)
    return hydrateCart(record)
  },

  update(
    cartId: string,
    data: {
      email?: string | null
      region_id?: string
      shipping_address?: Record<string, any>
      billing_address?: Record<string, any>
      promo_codes?: string[]
    }
  ) {
    const record = getCartRecord(cartId)
    if (data.email !== undefined) record.email = data.email
    if (data.region_id) record.region_id = data.region_id
    if (data.shipping_address) {
      record.shipping_address = { id: uid("caaddr"), ...data.shipping_address }
    }
    if (data.billing_address) {
      record.billing_address = { id: uid("caaddr"), ...data.billing_address }
    }
    if (data.promo_codes) {
      const codes = data.promo_codes
        .map((c) => (c ?? "").trim().toUpperCase())
        .filter(Boolean)
      const unknown = codes.find((c) => !(c in PROMO_CODES))
      if (unknown) {
        throw new MockError(
          `The promotion code ${unknown} is invalid. Try MONSOON10.`
        )
      }
      record.promo_codes = Array.from(new Set([...record.promo_codes, ...codes]))
    }
    touchCart(record)
    return hydrateCart(record)
  },

  addItem(cartId: string, variantId: string, quantity: number) {
    const record = getCartRecord(cartId)
    const found = findVariant(variantId)
    if (!found) throw new MockError("Variant not found")

    const existing = record.items.find((i) => i.variant_id === variantId)
    const nextQty = (existing?.quantity ?? 0) + quantity
    if (nextQty > availableUnits(found.variant)) {
      throw new MockError("Variant does not have the required inventory")
    }

    if (existing) existing.quantity = nextQty
    else
      record.items.push({
        id: uid("item"),
        variant_id: variantId,
        quantity,
        created_at: now(),
      })
    touchCart(record)
  },

  updateItem(cartId: string, lineId: string, quantity: number) {
    const record = getCartRecord(cartId)
    const item = record.items.find((i) => i.id === lineId)
    if (!item) throw new MockError("Line item not found")
    const found = findVariant(item.variant_id)
    if (found && quantity > availableUnits(found.variant)) {
      throw new MockError("Variant does not have the required inventory")
    }
    item.quantity = quantity
    touchCart(record)
  },

  deleteItem(cartId: string, lineId: string) {
    const record = getCartRecord(cartId)
    record.items = record.items.filter((i) => i.id !== lineId)
    touchCart(record)
  },

  setShippingMethods(cartId: string, optionIds: string[]) {
    const record = getCartRecord(cartId)
    record.shipping_option_ids = optionIds.filter((id) =>
      SHIPPING_OPTIONS.some((o) => o.id === id)
    )
    touchCart(record)
  },

  initPaymentSession(cartId: string) {
    const record = getCartRecord(cartId)
    record.payment_session = { id: uid("payses"), status: "pending" }
    return hydrateCart(record)
  },

  transfer(cartId: string, customerId: string) {
    const record = getDb().carts.get(cartId)
    if (!record) return
    const customer = getDb().customers.get(customerId)
    record.customer_id = customerId
    record.email = record.email ?? customer?.email ?? null
  },

  complete(cartId: string) {
    const db = getDb()
    const record = getCartRecord(cartId)
    if (record.completed_at) throw new MockError("Cart is already completed")
    if (!record.items.length) throw new MockError("Cart is empty")
    if (!record.shipping_address?.address_1) {
      throw new MockError("Shipping address is required")
    }
    if (!record.payment_session) throw new MockError("Payment session missing")

    // Reserve stock now, as Medusa does at completion.
    for (const item of record.items) {
      const found = findVariant(item.variant_id)
      if (found && item.quantity > availableUnits(found.variant)) {
        throw new MockError("Variant does not have the required inventory")
      }
    }
    for (const item of record.items) {
      const left = db.stock.get(item.variant_id)
      if (left !== undefined) db.stock.set(item.variant_id, left - item.quantity)
    }

    const cart = hydrateCart(record)
    record.completed_at = now()
    const order = createOrderFromCart(db, cart)
    return { type: "order" as const, order }
  },
}

// ── Orders ─────────────────────────────────────────────────────────────────

function createOrderFromCart(
  db: MockDb,
  cart: HttpTypes.StoreCart,
  createdAt: string = now()
) {
  const id = uid("order")
  const items = (cart.items ?? []).map((i) => ({ ...i, id: uid("ordli") }))
  const ticketItems = items.filter(
    (i: any) => i.product?.shipping_profile?.id === "sp_digital"
  )

  const fulfillments = ticketItems.length
    ? [
        {
          id: uid("ful"),
          provider_id: "manual_manual",
          created_at: createdAt,
          shipped_at: createdAt,
          delivered_at: createdAt,
          canceled_at: null,
          labels: [],
          data: {},
          metadata: {
            type: "digital",
            tickets: ticketItems.flatMap((i) =>
              Array.from({ length: i.quantity }, (_, n) => ({
                title: i.product_title,
                code: `MCC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                unit: n + 1,
              }))
            ),
          },
        },
      ]
    : []

  const order: OrderRecord = {
    id,
    display_id: db.nextDisplayId++,
    status: "pending",
    fulfillment_status: !ticketItems.length
      ? "not_fulfilled"
      : ticketItems.length === items.length
        ? "fulfilled"
        : "partially_fulfilled",
    payment_status: "captured",
    email: cart.email ?? "",
    customer_id: cart.customer_id ?? null,
    region_id: cart.region_id,
    currency_code: cart.currency_code,
    items,
    shipping_address: cart.shipping_address,
    billing_address: cart.billing_address,
    shipping_methods: cart.shipping_methods,
    promotions: cart.promotions,
    payment_collections: [
      {
        id: uid("paycol"),
        status: "captured",
        amount: cart.total,
        payments: [
          {
            id: uid("pay"),
            provider_id: "pp_razorpay_razorpay",
            amount: cart.total,
            currency_code: cart.currency_code,
            created_at: createdAt,
            captured_at: createdAt,
            data: {},
          },
        ],
      },
    ],
    fulfillments,
    item_subtotal: cart.item_subtotal,
    item_total: cart.item_total,
    subtotal: cart.subtotal,
    discount_total: cart.discount_total,
    shipping_total: cart.shipping_total,
    shipping_subtotal: cart.shipping_subtotal,
    tax_total: 0,
    gift_card_total: 0,
    original_total: cart.original_total,
    total: cart.total,
    canceled_at: null,
    metadata: {},
    created_at: createdAt,
    updated_at: createdAt,
  }

  db.orders.set(id, order)
  return order as unknown as HttpTypes.StoreOrder
}

function seedDemoOrder(db: MockDb) {
  const demo = db.customers.get("cus_demo")!
  const address = { ...demo.addresses[0] }
  const cart = hydrateCart({
    id: "cart_seed",
    region_id: REGIONS[0].id,
    customer_id: demo.id,
    email: demo.email,
    items: [
      { id: "item_seed_1", variant_id: "prod_malabar_var_1", quantity: 1, created_at: now() },
      { id: "item_seed_2", variant_id: "prod_mug_var_0", quantity: 2, created_at: now() },
    ],
    shipping_address: address,
    billing_address: address,
    shipping_option_ids: ["so_standard"],
    promo_codes: [],
    payment_session: { id: "payses_seed", status: "pending" },
    completed_at: now(),
    created_at: now(),
  })
  const placed = new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()
  const order = createOrderFromCart(db, cart, placed) as any
  const shippedAt = new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
  const deliveredAt = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString()
  order.status = "completed"
  order.fulfillment_status = "delivered"
  order.fulfillments = [
    {
      id: "ful_seed",
      provider_id: "shipmozo_shipmozo",
      created_at: placed,
      packed_at: placed,
      shipped_at: shippedAt,
      delivered_at: deliveredAt,
      canceled_at: null,
      labels: [{ tracking_number: "MCC1234567890", tracking_url: null }],
      data: {
        shipmozo: {
          awb_number: "MCC1234567890",
          courier: "Demo Couriers",
          current_status: "Delivered",
          status_time: deliveredAt,
        },
      },
      metadata: {},
    },
  ]
}

const ownsOrder = (order: OrderRecord, customerId: string | null) =>
  !!customerId && order.customer_id === customerId

export const mockOrders = {
  // Order confirmation pages are reachable by id (guests check out too).
  retrieve(orderId: string) {
    const order = getDb().orders.get(orderId)
    if (!order) throw new MockError("Order not found")
    return order as unknown as HttpTypes.StoreOrder
  },

  listForCustomer(customerId: string, limit: number, offset: number) {
    const orders = Array.from(getDb().orders.values())
      .filter((o) => o.customer_id === customerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    return orders.slice(offset, offset + limit) as unknown as HttpTypes.StoreOrder[]
  },

  cancel(orderId: string, customerId: string | null) {
    const order = getDb().orders.get(orderId)
    if (!order || !ownsOrder(order, customerId)) {
      throw new MockError("Order not found")
    }
    if (order.fulfillment_status === "delivered" || order.status === "completed") {
      throw new MockError("Delivered orders can't be canceled")
    }
    order.status = "canceled"
    order.canceled_at = now()
    for (const item of order.items) {
      const left = getDb().stock.get(item.variant_id)
      if (left !== undefined) getDb().stock.set(item.variant_id, left + item.quantity)
    }
  },

  requestRefund(orderId: string, customerId: string | null, note?: string) {
    const order = getDb().orders.get(orderId)
    if (!order || !ownsOrder(order, customerId)) {
      throw new MockError("Order not found")
    }
    order.metadata = { ...order.metadata, refund_requested_at: now(), refund_note: note }
  },

  requestTransfer(orderId: string) {
    const order = getDb().orders.get(orderId)
    if (!order) throw new MockError("Order not found")
    return { id: order.id, email: order.email } as unknown as HttpTypes.StoreOrder
  },

  acceptTransfer(orderId: string, customerId: string | null) {
    const order = getDb().orders.get(orderId)
    if (!order) throw new MockError("Order not found")
    if (!customerId) throw new MockError("Sign in to accept this transfer")
    order.customer_id = customerId
    return order as unknown as HttpTypes.StoreOrder
  },

  declineTransfer(orderId: string) {
    const order = getDb().orders.get(orderId)
    if (!order) throw new MockError("Order not found")
    return order as unknown as HttpTypes.StoreOrder
  },
}

// ── Customers & auth ───────────────────────────────────────────────────────

function hydrateCustomer(c: CustomerRecord): HttpTypes.StoreCustomer {
  const { password: _password, ...rest } = c
  const orders = mockOrders.listForCustomer(c.id, 100, 0)
  return {
    ...rest,
    company_name: null,
    has_account: true,
    default_billing_address_id:
      c.addresses.find((a) => a.is_default_billing)?.id ?? null,
    default_shipping_address_id:
      c.addresses.find((a) => a.is_default_shipping)?.id ?? null,
    addresses: c.addresses.map((a) => ({ ...a, customer_id: c.id })),
    orders,
    metadata: {},
    updated_at: now(),
  } as unknown as HttpTypes.StoreCustomer
}

const findByEmail = (email: string) => {
  const target = email.trim().toLowerCase()
  return Array.from(getDb().customers.values()).find(
    (c) => c.email.toLowerCase() === target
  )
}

const issueToken = (customerId: string) => {
  const token = uid("sess")
  getDb().sessions.set(token, customerId)
  return token
}

const clearDefaults = (c: CustomerRecord, address: Partial<Address>) => {
  for (const a of c.addresses) {
    if (address.is_default_shipping) a.is_default_shipping = false
    if (address.is_default_billing) a.is_default_billing = false
  }
}

export const mockAuth = {
  customerIdForToken(token?: string | null) {
    return token ? getDb().sessions.get(token) ?? null : null
  },

  register(input: {
    email: string
    password: string
    first_name?: string
    last_name?: string
    phone?: string
  }) {
    if (!input.email || !/^\S+@\S+\.\S+$/.test(input.email)) {
      throw new MockError("Enter a valid email address")
    }
    if (findByEmail(input.email)) {
      throw new MockError("Identity with email already exists")
    }
    const customer: CustomerRecord = {
      id: uid("cus"),
      email: input.email.trim(),
      first_name: input.first_name ?? "",
      last_name: input.last_name ?? "",
      phone: input.phone ?? "",
      password: input.password || null,
      addresses: [],
      created_at: now(),
    }
    getDb().customers.set(customer.id, customer)
    return issueToken(customer.id)
  },

  login(email: string, password: string) {
    const customer = findByEmail(email)
    if (!customer || !customer.password || customer.password !== password) {
      throw new MockError("Invalid email or password")
    }
    return issueToken(customer.id)
  },

  // OTP login: any registered email + DEMO_OTP signs in.
  sendOtp(email: string) {
    const customer = findByEmail(email)
    if (!customer) throw new MockError("No account found for that email")
    const [name, domain] = customer.email.split("@")
    return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`
  },

  verifyOtp(email: string, code: string) {
    const customer = findByEmail(email)
    if (!customer) throw new MockError("No account found for that email")
    if (code.trim() !== DEMO_OTP) {
      throw new MockError(`Incorrect code. Use ${DEMO_OTP} in this demo.`)
    }
    return issueToken(customer.id)
  },

  logout(token?: string | null) {
    if (token) getDb().sessions.delete(token)
  },
}

function getCustomerRecord(customerId: string | null) {
  const customer = customerId ? getDb().customers.get(customerId) : undefined
  if (!customer) throw new MockError("Unauthorized")
  return customer
}

export const mockCustomers = {
  retrieve(customerId: string | null) {
    const customer = customerId ? getDb().customers.get(customerId) : undefined
    return customer ? hydrateCustomer(customer) : null
  },

  update(
    customerId: string | null,
    data: { first_name?: string; last_name?: string; phone?: string }
  ) {
    const customer = getCustomerRecord(customerId)
    if (data.first_name !== undefined) customer.first_name = data.first_name
    if (data.last_name !== undefined) customer.last_name = data.last_name
    if (data.phone !== undefined) customer.phone = data.phone
    return hydrateCustomer(customer)
  },

  hasPassword(customerId: string | null) {
    return !!getCustomerRecord(customerId).password
  },

  setPassword(customerId: string | null, password: string, code: string) {
    const customer = getCustomerRecord(customerId)
    if (code.trim() !== DEMO_OTP) {
      throw new MockError(`Incorrect code. Use ${DEMO_OTP} in this demo.`)
    }
    if (!password || password.length < 8) {
      throw new MockError("Password must be at least 8 characters")
    }
    customer.password = password
  },

  maskedEmail(customerId: string | null) {
    return mockAuth.sendOtp(getCustomerRecord(customerId).email)
  },

  addAddress(customerId: string | null, address: Partial<Address>) {
    const customer = getCustomerRecord(customerId)
    clearDefaults(customer, address)
    customer.addresses.push({ ...address, id: uid("addr") })
  },

  updateAddress(
    customerId: string | null,
    addressId: string,
    address: Partial<Address>
  ) {
    const customer = getCustomerRecord(customerId)
    const existing = customer.addresses.find((a) => a.id === addressId)
    if (!existing) throw new MockError("Address not found")
    clearDefaults(customer, address)
    Object.assign(existing, address)
  },

  deleteAddress(customerId: string | null, addressId: string) {
    const customer = getCustomerRecord(customerId)
    customer.addresses = customer.addresses.filter((a) => a.id !== addressId)
  },
}

// ── Reviews ────────────────────────────────────────────────────────────────

export const mockReviews = {
  list(productId: string) {
    const reviews = getDb()
      .reviews.filter((r) => r.product_id === productId && r.status === "published")
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
    const average = reviews.length
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0
    return {
      reviews,
      summary: { count: reviews.length, average_rating: Math.round(average * 10) / 10 },
    }
  },

  create(
    customerId: string,
    input: {
      product_id: string
      variant_id?: string | null
      rating: number
      title?: string | null
      body: string
      images?: string[]
    }
  ) {
    const customer = getCustomerRecord(customerId)
    const variant = input.variant_id ? findVariant(input.variant_id)?.variant : null
    const review: Review = {
      id: uid("rev"),
      product_id: input.product_id,
      customer_id: customer.id,
      customer_name: `${customer.first_name} ${customer.last_name.slice(0, 1)}.`.trim(),
      variant_id: input.variant_id ?? null,
      variant_title: variant?.title ?? null,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
      images: input.images ?? [],
      status: "published",
      created_at: now(),
    }
    getDb().reviews.push(review)
    return review
  },
}

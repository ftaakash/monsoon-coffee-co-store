import "server-only"

import type Database from "better-sqlite3"

import { hashPassword } from "../passwords"
import {
  BREW_METHODS,
  BREWS,
  CATEGORIES,
  COFFEE_PROFILES,
  COLLECTIONS,
  DEMO_ADMIN,
  DEMO_CUSTOMER,
  EVENT_DETAILS,
  FILTER_CATEGORIES,
  PRODUCT_SEEDS,
  PROMO_CODES,
  SEED_REVIEWS,
  SHIPPING_OPTIONS,
  TAGS,
} from "./seed-data"

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 3600 * 1000).toISOString()

/**
 * Fills an empty database with the starting catalogue, a demo customer with
 * one delivered order, and an admin user. Does nothing once products exist,
 * except add any sample reviews that are missing.
 */
export function seedDatabase(db: Database.Database) {
  // IMMEDIATE takes the write lock up front, so two processes starting at the
  // same time (e.g. `next build` workers) can't both seed.
  db.transaction(() => {
    const { n } = db.prepare("SELECT COUNT(*) AS n FROM products").get() as { n: number }
    if (n > 0) return

    const insert = (table: string, row: Record<string, unknown>) => {
      const cols = Object.keys(row)
      db.prepare(
        `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map((c) => "@" + c).join(", ")})`
      ).run(
        Object.fromEntries(
          Object.entries(row).map(([k, v]) => [k, typeof v === "boolean" ? Number(v) : v])
        )
      )
    }

    for (const c of CATEGORIES) insert("categories", c)
    for (const c of COLLECTIONS) insert("collections", c)
    for (const t of Object.values(TAGS)) insert("tags", t)
    for (const f of FILTER_CATEGORIES) {
      insert("filter_categories", { id: f.id, name: f.name, handle: f.handle, rank: f.rank })
      f.tags.forEach((t, rank) =>
        insert("filter_category_tags", { filter_category_id: f.id, tag_id: t.id, rank })
      )
    }

    for (const p of PRODUCT_SEEDS) {
      insert("products", {
        id: p.id,
        handle: p.handle,
        title: p.title,
        subtitle: p.subtitle ?? null,
        description: p.description,
        images_json: JSON.stringify(p.images),
        collection_id: p.collectionId ?? null,
        shipping_profile: p.shippingProfile ?? "physical",
        status: "published",
        created_at: p.createdAt,
        updated_at: p.createdAt,
      })
      for (const categoryId of p.categoryIds)
        insert("product_categories", { product_id: p.id, category_id: categoryId })
      for (const t of p.tags) insert("product_tags", { product_id: p.id, tag_id: t.id })
      p.variants.forEach((v, i) =>
        insert("variants", {
          id: `${p.id}_var_${i}`,
          product_id: p.id,
          title: v.title,
          sku: `${p.handle}-${i}`.toUpperCase(),
          options_json: JSON.stringify(v.options),
          price: v.price,
          original_price: v.originalPrice ?? null,
          manage_inventory: v.stock !== undefined,
          stock: v.stock ?? null,
          rank: i,
        })
      )
    }

    for (const [productId, profile] of Object.entries(COFFEE_PROFILES))
      insert("coffee_profiles", { product_id: productId, data_json: JSON.stringify(profile) })
    for (const m of Object.values(BREW_METHODS))
      insert("brew_methods", { id: m.id, data_json: JSON.stringify(m) })
    for (const recipes of Object.values(BREWS))
      recipes.forEach((r, rank) =>
        insert("brew_recipes", {
          id: r.id,
          product_id: r.product_id,
          brew_method_id: r.brew_method.id,
          data_json: JSON.stringify({ title: r.title, summary: r.summary, params: r.params, steps: r.steps }),
          rank,
        })
      )
    for (const [productId, detail] of Object.entries(EVENT_DETAILS))
      insert("event_details", { product_id: productId, data_json: JSON.stringify(detail) })

    for (const o of SHIPPING_OPTIONS) insert("shipping_options", o)
    for (const p of PROMO_CODES) insert("promo_codes", { ...p, active: true })

    const c = DEMO_CUSTOMER
    insert("customers", {
      id: c.id,
      email: c.email,
      first_name: c.first_name,
      last_name: c.last_name,
      phone: c.phone,
      password_hash: hashPassword(c.password),
      created_at: c.created_at,
      updated_at: c.created_at,
    })
    insert("addresses", {
      ...c.address,
      customer_id: c.id,
      is_default_shipping: true,
      is_default_billing: true,
      created_at: c.created_at,
    })
    insert("admin_users", {
      id: DEMO_ADMIN.id,
      email: DEMO_ADMIN.email,
      name: DEMO_ADMIN.name,
      password_hash: hashPassword(DEMO_ADMIN.password),
      created_at: c.created_at,
    })

    seedDeliveredOrder(insert)
  }).immediate()

  syncSeedReviews(db)
}

/**
 * Adds any sample review that isn't in the database yet. INSERT OR IGNORE
 * skips ids that already exist, so a review the admin has hidden stays hidden.
 */
function syncSeedReviews(db: Database.Database) {
  const insert = db.prepare(
    `INSERT OR IGNORE INTO reviews (id, product_id, customer_name, variant_title, rating, title, body, status, created_at)
     SELECT @id, @product_id, @customer_name, @variant_title, @rating, @title, @body, @status, @created_at
     WHERE EXISTS (SELECT 1 FROM products WHERE id = @product_id)`
  )
  db.transaction(() => {
    for (const r of SEED_REVIEWS)
      insert.run({
        id: r.id,
        product_id: r.product_id,
        customer_name: r.customer_name ?? null,
        variant_title: r.variant_title ?? null,
        rating: r.rating,
        title: r.title ?? null,
        body: r.body,
        status: r.status,
        created_at: r.created_at,
      })
  })()
}

// Order #1001: delivered six days after it was placed, so the account pages
// have a tracking timeline to show.
function seedDeliveredOrder(insert: (table: string, row: Record<string, unknown>) => void) {
  const c = DEMO_CUSTOMER
  const address = { ...c.address }
  const placed = daysAgo(6)
  const shipped = daysAgo(4)
  const delivered = daysAgo(2)
  const lines = [
    { id: "ordli_seed_1", product_id: "prod_malabar", variant_id: "prod_malabar_var_1", product_title: "Monsooned Malabar AA", product_handle: "monsooned-malabar-aa", variant_title: "500g", thumbnail: "/monsoon/images/Product.png", quantity: 1, unit_price: 1199 },
    { id: "ordli_seed_2", product_id: "prod_mug", variant_id: "prod_mug_var_0", product_title: "Monsoon Enamel Mug", product_handle: "monsoon-enamel-mug", variant_title: "White", thumbnail: "/monsoon/images/about3.png", quantity: 2, unit_price: 699 },
  ]
  const subtotal = lines.reduce((s, l) => s + l.unit_price * l.quantity, 0)

  insert("orders", {
    id: "order_seed_1001",
    display_id: 1001,
    customer_id: c.id,
    email: c.email,
    status: "completed",
    fulfillment_status: "delivered",
    payment_status: "captured",
    region_id: "reg_india",
    currency_code: "inr",
    shipping_address_json: JSON.stringify(address),
    billing_address_json: JSON.stringify(address),
    shipping_methods_json: JSON.stringify([
      { id: "sm_seed", name: "Standard Delivery", shipping_option_id: "so_standard", amount: 0, subtotal: 0, total: 0, data: {} },
    ]),
    promotions_json: "[]",
    fulfillments_json: JSON.stringify([
      {
        id: "ful_seed",
        provider_id: "manual_manual",
        created_at: placed,
        packed_at: placed,
        shipped_at: shipped,
        delivered_at: delivered,
        canceled_at: null,
        labels: [{ tracking_number: "MCC1234567890", tracking_url: null }],
        data: {
          shipmozo: {
            awb_number: "MCC1234567890",
            courier: "Demo Couriers",
            current_status: "Delivered",
            status_time: delivered,
          },
        },
        metadata: {},
      },
    ]),
    metadata_json: "{}",
    subtotal,
    discount_total: 0,
    shipping_total: 0,
    tax_total: 0,
    total: subtotal,
    created_at: placed,
    updated_at: delivered,
  })
  for (const l of lines)
    insert("order_items", {
      ...l,
      order_id: "order_seed_1001",
      is_digital: false,
      total: l.unit_price * l.quantity,
      created_at: placed,
    })
}

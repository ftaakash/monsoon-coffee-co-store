import "server-only"

import { getDb, parseJson } from "../db"
import { notFound } from "../errors"

// Read side of the catalogue. Rows are turned into the same JSON shapes the
// Medusa Store API returns, so the storefront components work unchanged.

export const CURRENCY = "inr"

// Regions and payment providers are configuration, not data the admin edits.
export const REGIONS = [
  {
    id: "reg_india",
    name: "India",
    currency_code: CURRENCY,
    automatic_taxes: true,
    countries: [
      {
        id: "in",
        iso_2: "in",
        iso_3: "ind",
        num_code: "356",
        name: "INDIA",
        display_name: "India",
        region_id: "reg_india",
      },
    ],
    payment_providers: [{ id: "pp_razorpay_razorpay", is_enabled: true }],
  },
]

export const PAYMENT_PROVIDERS = [{ id: "pp_razorpay_razorpay", is_enabled: true }]

export type ProductRow = {
  id: string
  handle: string
  title: string
  subtitle: string | null
  description: string
  images_json: string
  collection_id: string | null
  shipping_profile: "physical" | "digital"
  status: "published" | "draft"
  created_at: string
  updated_at: string
}

export type VariantRow = {
  id: string
  product_id: string
  title: string
  sku: string | null
  options_json: string
  price: number
  original_price: number | null
  manage_inventory: number
  stock: number | null
  rank: number
}

type CategoryRow = { id: string; name: string; handle: string; rank: number; show_brew_lab: number }
type CollectionRow = { id: string; title: string; handle: string }

const placeholders = (n: number) => Array(n).fill("?").join(", ")

const hydrateCategory = (c: CategoryRow) => ({
  id: c.id,
  name: c.name,
  handle: c.handle,
  rank: c.rank,
  description: "",
  show_brew_lab: !!c.show_brew_lab,
  parent_category: null,
  parent_category_id: null,
  category_children: [],
})

const hydrateCollection = (c: CollectionRow) => ({ ...c, metadata: null })

export function hydrateVariant(v: VariantRow, product: { id: string; images: unknown[] }) {
  const original = v.original_price ?? v.price
  const optionValues = parseJson<Record<string, string>>(v.options_json, {})
  return {
    id: v.id,
    title: v.title,
    sku: v.sku,
    product_id: v.product_id,
    manage_inventory: !!v.manage_inventory,
    allow_backorder: false,
    inventory_quantity: v.manage_inventory ? v.stock ?? 0 : null,
    images: product.images,
    // Filled in by hydrateProducts once the product's option ids are known.
    options: [] as unknown[],
    option_values: optionValues,
    calculated_price: {
      id: `${v.id}_price`,
      calculated_amount: v.price,
      original_amount: original,
      currency_code: CURRENCY,
      calculated_price: { price_list_type: original > v.price ? "sale" : null },
      original_price: { price_list_type: null },
    },
  }
}

/**
 * Builds full product objects (variants, options, images, categories, tags,
 * collection) for the given rows with one query per related table.
 */
export function hydrateProducts(rows: ProductRow[]) {
  if (!rows.length) return []
  const db = getDb()
  const ids = rows.map((r) => r.id)
  const inIds = placeholders(ids.length)

  const variants = db
    .prepare(`SELECT * FROM variants WHERE product_id IN (${inIds}) ORDER BY rank`)
    .all(...ids) as VariantRow[]
  const categories = db
    .prepare(
      `SELECT pc.product_id, c.* FROM product_categories pc
       JOIN categories c ON c.id = pc.category_id
       WHERE pc.product_id IN (${inIds}) ORDER BY c.rank`
    )
    .all(...ids) as (CategoryRow & { product_id: string })[]
  const tags = db
    .prepare(
      `SELECT pt.product_id, t.id, t.value FROM product_tags pt
       JOIN tags t ON t.id = pt.tag_id WHERE pt.product_id IN (${inIds})`
    )
    .all(...ids) as { product_id: string; id: string; value: string }[]
  const collections = db.prepare("SELECT * FROM collections").all() as CollectionRow[]

  return rows.map((p) => {
    const images = parseJson<string[]>(p.images_json, []).map((url, i) => ({
      id: `${p.id}_img_${i}`,
      url,
      rank: i,
    }))
    const productVariants = variants
      .filter((v) => v.product_id === p.id)
      .map((v) => hydrateVariant(v, { id: p.id, images }))

    // Options are derived from the variants: {"Size": "250g"} on each variant
    // gives a "Size" option with every distinct value.
    const optionTitles = Object.keys(productVariants[0]?.option_values ?? {})
    const options = optionTitles.map((title, i) => {
      const optionId = `${p.id}_opt_${i}`
      const values = Array.from(
        new Set(productVariants.map((v) => v.option_values[title]))
      ).map((value, j) => ({ id: `${optionId}_val_${j}`, value, option_id: optionId }))
      return { id: optionId, title, product_id: p.id, values }
    })
    for (const v of productVariants) {
      v.options = options.map((option) => {
        const value = option.values.find((val) => val.value === v.option_values[option.title])
        return {
          id: value?.id,
          value: value?.value,
          option_id: option.id,
          option: { id: option.id, title: option.title },
        }
      })
    }

    const collection = collections.find((c) => c.id === p.collection_id)
    return {
      id: p.id,
      handle: p.handle,
      title: p.title,
      subtitle: p.subtitle,
      description: p.description,
      thumbnail: images[0]?.url ?? null,
      images,
      options,
      variants: productVariants,
      tags: tags.filter((t) => t.product_id === p.id).map(({ id, value }) => ({ id, value })),
      categories: categories.filter((c) => c.product_id === p.id).map(hydrateCategory),
      collection: collection ? hydrateCollection(collection) : null,
      collection_id: p.collection_id,
      is_giftcard: false,
      discountable: true,
      status: p.status,
      metadata: {},
      shipping_profile: { id: `sp_${p.shipping_profile}` },
      created_at: p.created_at,
      updated_at: p.updated_at,
    }
  })
}

export type HydratedProduct = ReturnType<typeof hydrateProducts>[number]

export type ProductQuery = {
  id?: string[]
  handle?: string[]
  category_id?: string[]
  collection_id?: string[]
  tag_id?: string[]
  q?: string
  limit?: number
  offset?: number
  // Admin listings include drafts; the store only ever sees published products.
  include_drafts?: boolean
}

/**
 * Lists products newest first. Within one filter values are OR'd; across
 * filters they are AND'd (e.g. origin Malabar OR Coorg, AND roast Medium).
 */
export function listProducts(query: ProductQuery = {}) {
  const where: string[] = []
  const params: unknown[] = []
  const anyOf = (values: string[] | undefined, sql: (ph: string) => string) => {
    if (!values?.length) return
    where.push(sql(placeholders(values.length)))
    params.push(...values)
  }

  if (!query.include_drafts) where.push("p.status = 'published'")
  anyOf(query.id, (ph) => `p.id IN (${ph})`)
  anyOf(query.handle, (ph) => `p.handle IN (${ph})`)
  anyOf(query.collection_id, (ph) => `p.collection_id IN (${ph})`)
  anyOf(
    query.category_id,
    (ph) => `EXISTS (SELECT 1 FROM product_categories pc WHERE pc.product_id = p.id AND pc.category_id IN (${ph}))`
  )
  anyOf(
    query.tag_id,
    (ph) => `EXISTS (SELECT 1 FROM product_tags pt WHERE pt.product_id = p.id AND pt.tag_id IN (${ph}))`
  )
  if (query.q?.trim()) {
    where.push("(p.title LIKE ? OR p.description LIKE ?)")
    const like = `%${query.q.trim()}%`
    params.push(like, like)
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const db = getDb()
  const { count } = db
    .prepare(`SELECT COUNT(*) AS count FROM products p ${whereSql}`)
    .get(...params) as { count: number }
  const rows = db
    .prepare(
      `SELECT p.* FROM products p ${whereSql} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, query.limit ?? 100, query.offset ?? 0) as ProductRow[]

  return { products: hydrateProducts(rows), count }
}

export function retrieveProduct(id: string) {
  const row = getDb().prepare("SELECT * FROM products WHERE id = ?").get(id) as
    | ProductRow
    | undefined
  if (!row) throw notFound("Product not found")
  return hydrateProducts([row])[0]
}

/** A variant together with its (hydrated) product, or null. */
export function findVariant(variantId: string) {
  const row = getDb()
    .prepare(
      "SELECT p.* FROM products p JOIN variants v ON v.product_id = p.id WHERE v.id = ?"
    )
    .get(variantId) as ProductRow | undefined
  if (!row) return null
  const product = hydrateProducts([row])[0]
  const variant = product.variants.find((v) => v.id === variantId)!
  return { product, variant }
}

export const availableUnits = (variant: { manage_inventory: boolean; inventory_quantity: number | null }) =>
  variant.manage_inventory ? variant.inventory_quantity ?? 0 : Infinity

// ── Categories, collections, filters ──────────────────────────────────────

export function listCategories() {
  const rows = getDb().prepare("SELECT * FROM categories ORDER BY rank").all() as CategoryRow[]
  return rows.map((c) => ({
    ...hydrateCategory(c),
    products: listProducts({ category_id: [c.id] }).products,
  }))
}

export function listCollections() {
  const rows = getDb().prepare("SELECT * FROM collections ORDER BY title").all() as CollectionRow[]
  return rows.map((c) => ({
    ...hydrateCollection(c),
    products: listProducts({ collection_id: [c.id] }).products,
  }))
}

export function listFilterCategories() {
  const db = getDb()
  const cats = db.prepare("SELECT * FROM filter_categories ORDER BY rank").all() as {
    id: string
    name: string
    handle: string
    rank: number
  }[]
  const tags = db
    .prepare(
      `SELECT fct.filter_category_id, t.id, t.value FROM filter_category_tags fct
       JOIN tags t ON t.id = fct.tag_id ORDER BY fct.rank`
    )
    .all() as { filter_category_id: string; id: string; value: string }[]
  return cats.map((c) => ({
    ...c,
    tags: tags.filter((t) => t.filter_category_id === c.id).map(({ id, value }) => ({ id, value })),
  }))
}

// ── Product extras ────────────────────────────────────────────────────────

export function getCoffeeProfile(productId: string) {
  const row = getDb()
    .prepare("SELECT data_json FROM coffee_profiles WHERE product_id = ?")
    .get(productId) as { data_json: string } | undefined
  return row ? parseJson(row.data_json, null) : null
}

export function getEventDetail(productId: string) {
  const row = getDb()
    .prepare("SELECT data_json FROM event_details WHERE product_id = ?")
    .get(productId) as { data_json: string } | undefined
  return row ? parseJson(row.data_json, null) : null
}

export function listBrews(productId: string) {
  const rows = getDb()
    .prepare(
      `SELECT r.id, r.product_id, r.data_json, m.data_json AS method_json
       FROM brew_recipes r JOIN brew_methods m ON m.id = r.brew_method_id
       WHERE r.product_id = ? ORDER BY r.rank`
    )
    .all(productId) as { id: string; product_id: string; data_json: string; method_json: string }[]
  return rows.map((r) => ({
    id: r.id,
    product_id: r.product_id,
    ...parseJson<Record<string, unknown>>(r.data_json, {}),
    brew_method: parseJson(r.method_json, {}),
  }))
}

// ── Checkout configuration ────────────────────────────────────────────────

type ShippingOptionRow = {
  id: string
  name: string
  code: string
  amount: number
  shipping_profile: string
  description: string | null
}

export function listShippingOptions() {
  const rows = getDb().prepare("SELECT * FROM shipping_options").all() as ShippingOptionRow[]
  return rows.map((o) => ({
    id: o.id,
    name: o.name,
    price_type: "flat",
    amount: o.amount,
    shipping_profile_id: `sp_${o.shipping_profile}`,
    service_zone_id: "serzo_india",
    provider_id: "manual_manual",
    data: { description: o.description },
    type: { label: o.name.replace(/ Delivery$/, ""), description: o.description, code: o.code },
  }))
}

export function promoPercent(code: string) {
  const row = getDb()
    .prepare("SELECT percent FROM promo_codes WHERE code = ? AND active = 1")
    .get(code.trim().toUpperCase()) as { percent: number } | undefined
  return row?.percent ?? null
}

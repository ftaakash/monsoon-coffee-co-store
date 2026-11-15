import "server-only"

import { getDb, newId, now } from "../db"
import { badRequest, conflict, notFound, unauthorized } from "../errors"
import { newSessionToken, verifyPassword } from "../passwords"
import { retrieveProduct } from "./catalog"

const SESSION_HOURS = 12

// ── Admin sign-in (separate users and sessions from shoppers) ─────────────

export function adminLogin(email: string, password: string) {
  const admin = getDb().prepare("SELECT * FROM admin_users WHERE email = ?").get((email ?? "").trim()) as
    | { id: string; password_hash: string }
    | undefined
  if (!admin || !verifyPassword(password ?? "", admin.password_hash)) {
    throw unauthorized("Invalid email or password")
  }
  const token = newSessionToken()
  const created = new Date()
  getDb()
    .prepare("INSERT INTO admin_sessions (token, admin_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, admin.id, created.toISOString(), new Date(created.getTime() + SESSION_HOURS * 3600 * 1000).toISOString())
  return { token }
}

export function adminForToken(token?: string | null) {
  if (!token) return null
  return (
    (getDb()
      .prepare(
        `SELECT a.id, a.email, a.name FROM admin_sessions s JOIN admin_users a ON a.id = s.admin_id
         WHERE s.token = ? AND s.expires_at > ?`
      )
      .get(token, now()) as { id: string; email: string; name: string } | undefined) ?? null
  )
}

export function adminLogout(token?: string | null) {
  if (token) getDb().prepare("DELETE FROM admin_sessions WHERE token = ?").run(token)
}

// ── Dashboard ─────────────────────────────────────────────────────────────

export function dashboardStats() {
  const db = getDb()
  const one = <T>(sql: string, ...params: unknown[]) => db.prepare(sql).get(...params) as T
  const sales = one<{ revenue: number; orders: number }>(
    "SELECT COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders FROM orders WHERE canceled_at IS NULL"
  )
  return {
    revenue: sales.revenue,
    orders: sales.orders,
    to_ship: one<{ n: number }>(
      "SELECT COUNT(*) AS n FROM orders WHERE canceled_at IS NULL AND fulfillment_status IN ('not_fulfilled', 'partially_fulfilled')"
    ).n,
    customers: one<{ n: number }>("SELECT COUNT(*) AS n FROM customers").n,
    new_messages: one<{ n: number }>("SELECT COUNT(*) AS n FROM contact_messages WHERE status = 'new'").n,
    low_stock: db
      .prepare(
        `SELECT v.id, v.title, v.stock, p.id AS product_id, p.title AS product_title
         FROM variants v JOIN products p ON p.id = v.product_id
         WHERE v.manage_inventory = 1 AND v.stock <= 5 ORDER BY v.stock, p.title`
      )
      .all() as { id: string; title: string; stock: number; product_id: string; product_title: string }[],
    top_products: db
      .prepare(
        `SELECT oi.product_title AS title, SUM(oi.quantity) AS units, SUM(oi.total) AS revenue
         FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.canceled_at IS NULL
         GROUP BY oi.product_title ORDER BY revenue DESC LIMIT 5`
      )
      .all() as { title: string; units: number; revenue: number }[],
  }
}

// ── Products ──────────────────────────────────────────────────────────────

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

export function listFormOptions() {
  const db = getDb()
  return {
    categories: db.prepare("SELECT id, name FROM categories ORDER BY rank").all() as { id: string; name: string }[],
    collections: db.prepare("SELECT id, title FROM collections ORDER BY title").all() as { id: string; title: string }[],
    tags: db.prepare("SELECT id, value FROM tags ORDER BY value").all() as { id: string; value: string }[],
  }
}

export type ProductInput = {
  title: string
  handle?: string
  subtitle?: string | null
  description?: string
  images?: string[]
  collection_id?: string | null
  category_ids?: string[]
  tag_ids?: string[]
  shipping_profile?: "physical" | "digital"
  status?: "published" | "draft"
}

function validateProduct(input: ProductInput, productId?: string) {
  if (!input.title?.trim()) throw badRequest("Title is required")
  const handle = slugify(input.handle || input.title)
  if (!handle) throw badRequest("Handle is required")
  const clash = getDb().prepare("SELECT id FROM products WHERE handle = ? AND id != ?").get(handle, productId ?? "")
  if (clash) throw conflict(`Another product already uses the handle "${handle}"`)
  if (input.status && !["published", "draft"].includes(input.status)) throw badRequest("Unknown status")
  if (input.shipping_profile && !["physical", "digital"].includes(input.shipping_profile))
    throw badRequest("Unknown shipping profile")
  return handle
}

function writeLinks(productId: string, input: ProductInput) {
  const db = getDb()
  if (input.category_ids) {
    db.prepare("DELETE FROM product_categories WHERE product_id = ?").run(productId)
    const ins = db.prepare("INSERT INTO product_categories (product_id, category_id) VALUES (?, ?)")
    for (const id of new Set(input.category_ids)) ins.run(productId, id)
  }
  if (input.tag_ids) {
    db.prepare("DELETE FROM product_tags WHERE product_id = ?").run(productId)
    const ins = db.prepare("INSERT INTO product_tags (product_id, tag_id) VALUES (?, ?)")
    for (const id of new Set(input.tag_ids)) ins.run(productId, id)
  }
}

export type VariantInput = {
  title: string
  option_title?: string
  price: number
  original_price?: number | null
  manage_inventory?: boolean
  stock?: number | null
}

function validateVariant(v: VariantInput) {
  if (!v.title?.trim()) throw badRequest("Variant title is required")
  if (!Number.isInteger(v.price) || v.price < 0) throw badRequest("Price must be a whole number of rupees")
  if (v.original_price != null && (!Number.isInteger(v.original_price) || v.original_price < v.price))
    throw badRequest("Original price must be a whole number at least the sale price")
  if (v.manage_inventory && (!Number.isInteger(v.stock) || (v.stock as number) < 0))
    throw badRequest("Stock must be 0 or more")
}

export function createProduct(input: ProductInput & { variant: VariantInput }) {
  const handle = validateProduct(input)
  validateVariant(input.variant)
  const db = getDb()
  const id = newId("prod")
  const ts = now()
  db.transaction(() => {
    db.prepare(
      `INSERT INTO products (id, handle, title, subtitle, description, images_json, collection_id,
         shipping_profile, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      handle,
      input.title.trim(),
      input.subtitle?.trim() || null,
      input.description?.trim() ?? "",
      JSON.stringify(input.images ?? []),
      input.collection_id || null,
      input.shipping_profile ?? "physical",
      input.status ?? "draft",
      ts,
      ts
    )
    writeLinks(id, input)
    insertVariant(id, handle, input.variant, 0)
  })()
  return retrieveProduct(id)
}

export function updateProduct(productId: string, input: ProductInput) {
  retrieveProduct(productId)
  const handle = validateProduct(input, productId)
  const db = getDb()
  db.transaction(() => {
    db.prepare(
      `UPDATE products SET handle = ?, title = ?, subtitle = ?, description = ?, images_json = COALESCE(?, images_json),
         collection_id = ?, shipping_profile = COALESCE(?, shipping_profile), status = COALESCE(?, status), updated_at = ?
       WHERE id = ?`
    ).run(
      handle,
      input.title.trim(),
      input.subtitle?.trim() || null,
      input.description?.trim() ?? "",
      input.images ? JSON.stringify(input.images) : null,
      input.collection_id || null,
      input.shipping_profile ?? null,
      input.status ?? null,
      now(),
      productId
    )
    writeLinks(productId, input)
  })()
  return retrieveProduct(productId)
}

function insertVariant(productId: string, handle: string, v: VariantInput, rank: number) {
  const id = newId("variant")
  getDb()
    .prepare(
      `INSERT INTO variants (id, product_id, title, sku, options_json, price, original_price, manage_inventory, stock, rank)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      productId,
      v.title.trim(),
      `${handle}-${rank}-${id.slice(-4)}`.toUpperCase(),
      JSON.stringify({ [v.option_title?.trim() || "Option"]: v.title.trim() }),
      v.price,
      v.original_price ?? null,
      v.manage_inventory ? 1 : 0,
      v.manage_inventory ? v.stock : null,
      rank
    )
  return id
}

export function addVariant(productId: string, v: VariantInput) {
  const product = retrieveProduct(productId)
  validateVariant(v)
  // New variants reuse the product's existing option name (e.g. "Size").
  const optionTitle = product.options[0]?.title ?? v.option_title ?? "Option"
  if (product.variants.some((x) => x.title.toLowerCase() === v.title.trim().toLowerCase()))
    throw conflict(`This product already has a "${v.title}" variant`)
  insertVariant(productId, product.handle, { ...v, option_title: optionTitle }, product.variants.length)
  return retrieveProduct(productId)
}

export function updateVariant(variantId: string, v: Omit<VariantInput, "title"> & { title?: string }) {
  const row = getDb().prepare("SELECT * FROM variants WHERE id = ?").get(variantId) as
    | { product_id: string; title: string; options_json: string }
    | undefined
  if (!row) throw notFound("Variant not found")
  const title = v.title?.trim() || row.title
  validateVariant({ ...v, title })
  const options = JSON.parse(row.options_json) as Record<string, string>
  const optionTitle = Object.keys(options)[0] ?? "Option"
  getDb()
    .prepare(
      `UPDATE variants SET title = ?, options_json = ?, price = ?, original_price = ?, manage_inventory = ?, stock = ?
       WHERE id = ?`
    )
    .run(
      title,
      JSON.stringify({ [optionTitle]: title }),
      v.price,
      v.original_price ?? null,
      v.manage_inventory ? 1 : 0,
      v.manage_inventory ? v.stock : null,
      variantId
    )
  getDb().prepare("UPDATE products SET updated_at = ? WHERE id = ?").run(now(), row.product_id)
  return retrieveProduct(row.product_id)
}

export function deleteVariant(variantId: string) {
  const db = getDb()
  const row = db.prepare("SELECT product_id FROM variants WHERE id = ?").get(variantId) as
    | { product_id: string }
    | undefined
  if (!row) throw notFound("Variant not found")
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM variants WHERE product_id = ?").get(row.product_id) as { n: number }
  if (n <= 1) throw conflict("A product needs at least one variant")
  // Remove it from open carts first; past orders keep their own snapshot.
  db.transaction(() => {
    db.prepare(
      "DELETE FROM cart_items WHERE variant_id = ? AND cart_id IN (SELECT id FROM carts WHERE completed_at IS NULL)"
    ).run(variantId)
    const inUse = db.prepare("SELECT 1 FROM cart_items WHERE variant_id = ?").get(variantId)
    if (inUse) throw conflict("This variant is referenced by completed carts; set its stock to 0 instead")
    db.prepare("DELETE FROM variants WHERE id = ?").run(variantId)
  })()
  return retrieveProduct(row.product_id)
}

/** Images the admin can pick from (the files shipped in public/monsoon/images). */
export const IMAGE_LIBRARY = [
  "/monsoon/images/Product.png",
  "/monsoon/images/coffeebags.png",
  "/monsoon/images/about1.png",
  "/monsoon/images/about2.png",
  "/monsoon/images/about3.png",
]

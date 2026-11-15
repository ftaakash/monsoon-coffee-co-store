import "server-only"

import { getDb, newId, now, parseJson } from "../db"
import { badRequest, notFound, unauthorized } from "../errors"
import { findVariant, retrieveProduct } from "./catalog"

const EMAIL_RE = /^\S+@\S+\.\S+$/

// ── Reviews ───────────────────────────────────────────────────────────────

type ReviewRow = {
  id: string
  product_id: string
  customer_id: string | null
  customer_name: string | null
  variant_id: string | null
  variant_title: string | null
  rating: number
  title: string | null
  body: string
  images_json: string
  status: "pending" | "published" | "rejected"
  created_at: string
}

const hydrateReview = ({ images_json, ...r }: ReviewRow) => ({ ...r, images: parseJson<string[]>(images_json, []) })

export function listProductReviews(productId: string) {
  const db = getDb()
  const reviews = (
    db
      .prepare("SELECT * FROM reviews WHERE product_id = ? AND status = 'published' ORDER BY created_at DESC")
      .all(productId) as ReviewRow[]
  ).map(hydrateReview)
  const { average } = db
    .prepare("SELECT AVG(rating) AS average FROM reviews WHERE product_id = ? AND status = 'published'")
    .get(productId) as { average: number | null }
  return {
    reviews,
    summary: { count: reviews.length, average_rating: Math.round((average ?? 0) * 10) / 10 },
  }
}

const MAX_IMAGES = 4
const MAX_IMAGE_CHARS = 3_000_000 // ~2 MB once base64 encoded

export function createReview(
  customerId: string | null,
  input: { product_id: string; variant_id?: string | null; rating: number; title?: string | null; body: string; images?: string[] }
) {
  if (!customerId) throw unauthorized("Sign in to leave a review.")
  const customer = getDb().prepare("SELECT first_name, last_name FROM customers WHERE id = ?").get(customerId) as
    | { first_name: string; last_name: string }
    | undefined
  if (!customer) throw unauthorized("Sign in to leave a review.")

  retrieveProduct(input.product_id)
  const rating = Number(input.rating)
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest("Rating must be 1 to 5 stars")
  if (!input.body?.trim()) throw badRequest("Write a few words about the product")
  const images = (input.images ?? []).slice(0, MAX_IMAGES)
  if (images.some((src) => src.length > MAX_IMAGE_CHARS)) throw badRequest("Each photo must be under 2 MB")

  const variant = input.variant_id ? findVariant(input.variant_id)?.variant : null
  const id = newId("rev")
  getDb()
    .prepare(
      `INSERT INTO reviews (id, product_id, customer_id, customer_name, variant_id, variant_title, rating,
         title, body, images_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`
    )
    .run(
      id,
      input.product_id,
      customerId,
      `${customer.first_name} ${customer.last_name.slice(0, 1)}.`.trim(),
      input.variant_id ?? null,
      variant?.title ?? null,
      rating,
      input.title?.trim() || null,
      input.body.trim(),
      JSON.stringify(images),
      now()
    )
  return hydrateReview(getDb().prepare("SELECT * FROM reviews WHERE id = ?").get(id) as ReviewRow)
}

export function listAllReviews() {
  return (
    getDb()
      .prepare(
        `SELECT r.*, p.title AS product_title FROM reviews r JOIN products p ON p.id = r.product_id
         ORDER BY r.created_at DESC`
      )
      .all() as (ReviewRow & { product_title: string })[]
  ).map((r) => ({ ...hydrateReview(r), product_title: r.product_title }))
}

export function setReviewStatus(id: string, status: string) {
  if (!["published", "rejected", "pending"].includes(status)) throw badRequest("Unknown status")
  const res = getDb().prepare("UPDATE reviews SET status = ? WHERE id = ?").run(status, id)
  if (!res.changes) throw notFound("Review not found")
}

// ── Contact form and newsletter ───────────────────────────────────────────

export function createContactMessage(input: { name: string; email: string; subject?: string; message: string }) {
  if (!input.name?.trim() || !input.message?.trim()) throw badRequest("Please fill in your name and message.")
  if (!EMAIL_RE.test(input.email ?? "")) throw badRequest("Enter a valid email address.")
  if (input.message.length > 5000) throw badRequest("Message is too long (5000 characters max).")
  getDb()
    .prepare("INSERT INTO contact_messages (id, name, email, subject, message, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(newId("msg"), input.name.trim(), input.email.trim(), input.subject?.trim() || null, input.message.trim(), now())
}

export function subscribeNewsletter(email: string) {
  if (!EMAIL_RE.test(email ?? "")) throw badRequest("Enter a valid email address.")
  // INSERT OR IGNORE makes signing up twice harmless.
  getDb().prepare("INSERT OR IGNORE INTO newsletter_subscribers (email, created_at) VALUES (?, ?)").run(email.trim(), now())
}

export function listContactMessages() {
  return getDb().prepare("SELECT * FROM contact_messages ORDER BY created_at DESC").all() as {
    id: string
    name: string
    email: string
    subject: string | null
    message: string
    status: "new" | "read"
    created_at: string
  }[]
}

export function setMessageStatus(id: string, status: string) {
  if (!["new", "read"].includes(status)) throw badRequest("Unknown status")
  const res = getDb().prepare("UPDATE contact_messages SET status = ? WHERE id = ?").run(status, id)
  if (!res.changes) throw notFound("Message not found")
}

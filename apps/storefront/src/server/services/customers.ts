import "server-only"

import { getDb, newId, now } from "../db"
import { badRequest, conflict, notFound, unauthorized } from "../errors"
import { hashPassword, newSessionToken, verifyPassword } from "../passwords"
import { listCustomerOrders } from "./orders"

// One-time codes: there is no email service in this project, so the code is
// fixed and shown on screen. A production build would generate a random code,
// store its hash with an expiry, and email it.
export const DEMO_OTP = "123456"

const SESSION_DAYS = 7
const EMAIL_RE = /^\S+@\S+\.\S+$/

type CustomerRow = {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  password_hash: string | null
  created_at: string
  updated_at: string
}

type AddressRow = Record<string, any> & {
  id: string
  customer_id: string
  is_default_shipping: number
  is_default_billing: number
}

const ADDRESS_FIELDS = [
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "city",
  "province",
  "postal_code",
  "country_code",
  "phone",
] as const

function hydrateCustomer(c: CustomerRow) {
  const addresses = (
    getDb().prepare("SELECT * FROM addresses WHERE customer_id = ? ORDER BY created_at").all(c.id) as AddressRow[]
  ).map((a) => ({ ...a, is_default_shipping: !!a.is_default_shipping, is_default_billing: !!a.is_default_billing }))

  return {
    id: c.id,
    email: c.email,
    first_name: c.first_name,
    last_name: c.last_name,
    phone: c.phone,
    company_name: null,
    has_account: true,
    default_billing_address_id: addresses.find((a) => a.is_default_billing)?.id ?? null,
    default_shipping_address_id: addresses.find((a) => a.is_default_shipping)?.id ?? null,
    addresses,
    orders: listCustomerOrders(c.id, 100, 0),
    metadata: {},
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

const findByEmail = (email: string) =>
  getDb().prepare("SELECT * FROM customers WHERE email = ?").get(email.trim()) as CustomerRow | undefined

function getCustomerRow(customerId: string | null) {
  const row = customerId
    ? (getDb().prepare("SELECT * FROM customers WHERE id = ?").get(customerId) as CustomerRow | undefined)
    : undefined
  if (!row) throw unauthorized()
  return row
}

const maskEmail = (email: string) => {
  const [name, domain] = email.split("@")
  return `${name.slice(0, 2)}${"*".repeat(Math.max(name.length - 2, 1))}@${domain}`
}

const checkCode = (code: string) => {
  if ((code ?? "").trim() !== DEMO_OTP) throw badRequest(`Incorrect code. Use ${DEMO_OTP} in this demo.`)
}

// ── Sessions ──────────────────────────────────────────────────────────────

function createSession(customerId: string) {
  const token = newSessionToken()
  const created = new Date()
  const expires = new Date(created.getTime() + SESSION_DAYS * 24 * 3600 * 1000)
  getDb()
    .prepare("INSERT INTO sessions (token, customer_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(token, customerId, created.toISOString(), expires.toISOString())
  return token
}

/** The customer id for a session token, or null if it is unknown or expired. */
export function customerIdForToken(token?: string | null) {
  if (!token) return null
  const row = getDb()
    .prepare("SELECT customer_id FROM sessions WHERE token = ? AND expires_at > ?")
    .get(token, now()) as { customer_id: string } | undefined
  return row?.customer_id ?? null
}

export function logout(token?: string | null) {
  if (token) getDb().prepare("DELETE FROM sessions WHERE token = ?").run(token)
}

// ── Sign up / sign in ─────────────────────────────────────────────────────

export function register(input: {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone?: string
}) {
  const email = (input.email ?? "").trim()
  if (!EMAIL_RE.test(email)) throw badRequest("Enter a valid email address")
  if (!input.password || input.password.length < 8) throw badRequest("Password must be at least 8 characters")
  if (findByEmail(email)) throw conflict("An account with this email already exists")

  const id = newId("cus")
  const ts = now()
  getDb()
    .prepare(
      `INSERT INTO customers (id, email, first_name, last_name, phone, password_hash, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, email, input.first_name ?? "", input.last_name ?? "", input.phone ?? "", hashPassword(input.password), ts, ts)
  return { token: createSession(id), customer: retrieveCustomer(id)! }
}

export function login(email: string, password: string) {
  const customer = findByEmail(email ?? "")
  // Same message for "no such email" and "wrong password", so the form can't
  // be used to discover which emails have accounts.
  if (!customer || !verifyPassword(password ?? "", customer.password_hash)) {
    throw unauthorized("Invalid email or password")
  }
  return { token: createSession(customer.id) }
}

export function sendLoginCode(email: string) {
  const customer = findByEmail(email ?? "")
  if (!customer) throw notFound("No account found for that email")
  return { email_masked: maskEmail(customer.email) }
}

export function verifyLoginCode(email: string, code: string) {
  const customer = findByEmail(email ?? "")
  if (!customer) throw notFound("No account found for that email")
  checkCode(code)
  return { token: createSession(customer.id) }
}

// ── Profile ───────────────────────────────────────────────────────────────

export function retrieveCustomer(customerId: string | null) {
  if (!customerId) return null
  const row = getDb().prepare("SELECT * FROM customers WHERE id = ?").get(customerId) as CustomerRow | undefined
  return row ? hydrateCustomer(row) : null
}

export function updateCustomer(customerId: string | null, data: { first_name?: string; last_name?: string; phone?: string }) {
  const c = getCustomerRow(customerId)
  getDb()
    .prepare("UPDATE customers SET first_name = ?, last_name = ?, phone = ?, updated_at = ? WHERE id = ?")
    .run(data.first_name ?? c.first_name, data.last_name ?? c.last_name, data.phone ?? c.phone, now(), c.id)
  return retrieveCustomer(c.id)!
}

export const hasPassword = (customerId: string | null) => !!getCustomerRow(customerId).password_hash

export const sendPasswordCode = (customerId: string | null) => ({
  email_masked: maskEmail(getCustomerRow(customerId).email),
})

export function setPassword(customerId: string | null, password: string, code: string) {
  const c = getCustomerRow(customerId)
  checkCode(code)
  if (!password || password.length < 8) throw badRequest("Password must be at least 8 characters")
  getDb()
    .prepare("UPDATE customers SET password_hash = ?, updated_at = ? WHERE id = ?")
    .run(hashPassword(password), now(), c.id)
}

// ── Addresses ─────────────────────────────────────────────────────────────

// Only one address can be the default for shipping (and one for billing).
function clearDefaults(customerId: string, address: { is_default_shipping?: boolean; is_default_billing?: boolean }) {
  if (address.is_default_shipping)
    getDb().prepare("UPDATE addresses SET is_default_shipping = 0 WHERE customer_id = ?").run(customerId)
  if (address.is_default_billing)
    getDb().prepare("UPDATE addresses SET is_default_billing = 0 WHERE customer_id = ?").run(customerId)
}

type AddressInput = Partial<Record<(typeof ADDRESS_FIELDS)[number], string>> & {
  is_default_shipping?: boolean
  is_default_billing?: boolean
}

export function addAddress(customerId: string | null, input: AddressInput) {
  const c = getCustomerRow(customerId)
  if (!input.address_1?.trim() || !input.city?.trim() || !input.postal_code?.trim()) {
    throw badRequest("Address, city and postal code are required")
  }
  const db = getDb()
  db.transaction(() => {
    clearDefaults(c.id, input)
    const id = newId("addr")
    db.prepare(
      `INSERT INTO addresses (id, customer_id, ${ADDRESS_FIELDS.join(", ")}, is_default_shipping, is_default_billing, created_at)
       VALUES (?, ?, ${ADDRESS_FIELDS.map(() => "?").join(", ")}, ?, ?, ?)`
    ).run(
      id,
      c.id,
      ...ADDRESS_FIELDS.map((f) => (f === "country_code" ? (input[f] || "in").toLowerCase() : input[f] ?? "")),
      input.is_default_shipping ? 1 : 0,
      input.is_default_billing ? 1 : 0,
      now()
    )
  })()
  return retrieveCustomer(c.id)!
}

export function updateAddress(customerId: string | null, addressId: string, input: AddressInput) {
  const c = getCustomerRow(customerId)
  const db = getDb()
  const existing = db.prepare("SELECT id FROM addresses WHERE id = ? AND customer_id = ?").get(addressId, c.id)
  if (!existing) throw notFound("Address not found")

  const sets: string[] = []
  const params: unknown[] = []
  for (const f of ADDRESS_FIELDS) {
    if (input[f] === undefined || input[f] === null) continue
    sets.push(`${f} = ?`)
    params.push(input[f])
  }
  for (const f of ["is_default_shipping", "is_default_billing"] as const) {
    if (input[f] === undefined) continue
    sets.push(`${f} = ?`)
    params.push(input[f] ? 1 : 0)
  }
  db.transaction(() => {
    clearDefaults(c.id, input)
    if (sets.length) db.prepare(`UPDATE addresses SET ${sets.join(", ")} WHERE id = ?`).run(...params, addressId)
  })()
  return retrieveCustomer(c.id)!
}

export function deleteAddress(customerId: string | null, addressId: string) {
  const c = getCustomerRow(customerId)
  getDb().prepare("DELETE FROM addresses WHERE id = ? AND customer_id = ?").run(addressId, c.id)
  return retrieveCustomer(c.id)!
}

// ── Admin ─────────────────────────────────────────────────────────────────

export function listCustomersForAdmin() {
  return getDb()
    .prepare(
      `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, c.created_at,
              COUNT(o.id) AS order_count, COALESCE(SUM(CASE WHEN o.canceled_at IS NULL THEN o.total END), 0) AS total_spent
       FROM customers c LEFT JOIN orders o ON o.customer_id = c.id
       GROUP BY c.id ORDER BY c.created_at DESC`
    )
    .all() as {
    id: string
    email: string
    first_name: string
    last_name: string
    phone: string
    created_at: string
    order_count: number
    total_spent: number
  }[]
}

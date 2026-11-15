"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ADMIN_COOKIE, adminApi, adminBackendUrl, getAdminToken } from "./api"

// Form handlers for the admin panel. Each one calls the admin API and then
// redirects back with ?ok=… or ?error=…, which the page shows as a notice.

const back = (path: string, result: { ok?: string; error?: string }): never => {
  const qs = new URLSearchParams(result as Record<string, string>).toString()
  redirect(`${path}${path.includes("?") ? "&" : "?"}${qs}`)
}

async function run(path: string, ok: string, fn: () => Promise<unknown>) {
  let error: string | null = null
  try {
    await fn()
  } catch (e) {
    // redirect() works by throwing; let it through.
    if ((e as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw e
    error = (e as Error).message
  }
  revalidatePath("/admin", "layout")
  // The storefront shows stock, prices and reviews, so refresh it too.
  revalidatePath("/", "layout")
  back(path, error ? { error } : { ok })
}

const str = (fd: FormData, key: string) => ((fd.get(key) as string | null) ?? "").trim()
const int = (fd: FormData, key: string) => {
  const v = str(fd, key)
  return v === "" ? null : Number(v)
}

// ── Session ───────────────────────────────────────────────────────────────

export async function adminSignIn(_state: unknown, formData: FormData) {
  const res = await fetch(`${adminBackendUrl}/api/admin/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: str(formData, "email"), password: formData.get("password") }),
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { error: data?.message || "Sign-in failed" }

  ;(await cookies()).set(ADMIN_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 3600,
  })
  redirect("/admin")
}

export async function adminSignOut() {
  const token = await getAdminToken()
  if (token) {
    await fetch(`${adminBackendUrl}/api/admin/auth`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    }).catch(() => {})
  }
  ;(await cookies()).set(ADMIN_COOKIE, "", { path: "/", maxAge: -1 })
  redirect("/admin/login")
}

// ── Orders ────────────────────────────────────────────────────────────────

export async function updateOrderStatus(formData: FormData) {
  const id = str(formData, "id")
  const action = str(formData, "action")
  const labels: Record<string, string> = {
    shipped: "Marked as shipped",
    out_for_delivery: "Marked as out for delivery",
    delivered: "Marked as delivered",
    canceled: "Order canceled and stock returned",
  }
  await run(`/admin/orders/${id}`, labels[action] ?? "Updated", () =>
    adminApi(`/orders/${id}/status`, { method: "POST", body: { action } })
  )
}

// ── Products ──────────────────────────────────────────────────────────────

const productBody = (fd: FormData) => ({
  title: str(fd, "title"),
  handle: str(fd, "handle"),
  subtitle: str(fd, "subtitle"),
  description: str(fd, "description"),
  status: str(fd, "status") || undefined,
  shipping_profile: str(fd, "shipping_profile") || undefined,
  collection_id: str(fd, "collection_id") || null,
  category_ids: fd.getAll("category_ids").map(String),
  tag_ids: fd.getAll("tag_ids").map(String),
  images: fd.getAll("images").map(String),
})

const variantBody = (fd: FormData) => ({
  title: str(fd, "variant_title") || str(fd, "title"),
  option_title: str(fd, "option_title") || undefined,
  price: int(fd, "price") ?? NaN,
  original_price: int(fd, "original_price"),
  manage_inventory: fd.get("manage_inventory") === "on",
  stock: int(fd, "stock"),
})

export async function createProductAction(formData: FormData) {
  let productId: string | null = null
  try {
    const { product } = await adminApi<{ product: { id: string } }>("/products", {
      method: "POST",
      body: { ...productBody(formData), variant: variantBody(formData) },
    })
    productId = product.id
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw e
    back("/admin/products/new", { error: (e as Error).message })
  }
  revalidatePath("/", "layout")
  back(`/admin/products/${productId}`, { ok: "Product created" })
}

export async function updateProductAction(formData: FormData) {
  const id = str(formData, "id")
  await run(`/admin/products/${id}`, "Product saved", () =>
    adminApi(`/products/${id}`, { method: "POST", body: productBody(formData) })
  )
}

export async function addVariantAction(formData: FormData) {
  const id = str(formData, "product_id")
  await run(`/admin/products/${id}`, "Variant added", () =>
    adminApi(`/products/${id}/variants`, { method: "POST", body: variantBody(formData) })
  )
}

export async function updateVariantAction(formData: FormData) {
  const productId = str(formData, "product_id")
  const variantId = str(formData, "variant_id")
  await run(`/admin/products/${productId}`, "Variant saved", () =>
    adminApi(`/variants/${variantId}`, { method: "POST", body: variantBody(formData) })
  )
}

export async function deleteVariantAction(formData: FormData) {
  const productId = str(formData, "product_id")
  const variantId = str(formData, "variant_id")
  await run(`/admin/products/${productId}`, "Variant deleted", () =>
    adminApi(`/variants/${variantId}`, { method: "DELETE" })
  )
}

// ── Inbox and reviews ─────────────────────────────────────────────────────

export async function setMessageStatusAction(formData: FormData) {
  const id = str(formData, "id")
  const status = str(formData, "status")
  await run("/admin/messages", status === "read" ? "Marked as read" : "Marked as new", () =>
    adminApi(`/messages/${id}`, { method: "POST", body: { status } })
  )
}

export async function setReviewStatusAction(formData: FormData) {
  const id = str(formData, "id")
  const status = str(formData, "status")
  await run("/admin/reviews", status === "rejected" ? "Review hidden from the store" : "Review published", () =>
    adminApi(`/reviews/${id}`, { method: "POST", body: { status } })
  )
}

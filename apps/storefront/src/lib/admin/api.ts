import "server-only"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export const ADMIN_COOKIE = "_monsoon_admin"

const BACKEND_URL = (
  process.env.BACKEND_URL ||
  `http://localhost:${process.env.PORT || 8000}`
).replace(/\/$/, "")

export const getAdminToken = async () => (await cookies()).get(ADMIN_COOKIE)?.value ?? null

/**
 * Calls the admin API with the admin session from the cookie. A 401 (no or
 * expired session) sends the browser to the admin sign-in page.
 */
export async function adminApi<T = Record<string, any>>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown; query?: Record<string, string | undefined> } = {}
): Promise<T> {
  const token = await getAdminToken()
  if (!token) redirect("/admin/login")

  const qs = new URLSearchParams(
    Object.entries(options.query ?? {}).filter((e): e is [string, string] => !!e[1])
  ).toString()
  const res = await fetch(`${BACKEND_URL}/api/admin${path}${qs ? `?${qs}` : ""}`, {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) redirect("/admin/login")
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`)
  return data as T
}

export const adminBackendUrl = BACKEND_URL

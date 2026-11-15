import "server-only"

import { getAuthToken } from "./cookies"

// Base URL of the backend API (the /api routes of this same Next.js app by
// default). Set BACKEND_URL to point the storefront at a backend elsewhere.
const BACKEND_URL = (
  process.env.BACKEND_URL ||
  `http://localhost:${process.env.PORT || 8000}`
).replace(/\/$/, "")

type Query = Record<string, string | number | string[] | undefined | null>

const toQueryString = (query?: Query) => {
  if (!query) return ""
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    for (const v of Array.isArray(value) ? value : [value]) params.append(key, String(v))
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

/**
 * Calls the store API. The shopper's session token (from the httpOnly
 * cookie) is sent as a Bearer token, so the API knows who is asking.
 * Throws an Error with the API's message when the response isn't 2xx.
 */
export async function storeApi<T = Record<string, any>>(
  path: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: unknown; query?: Query } = {}
): Promise<T> {
  const token = await getAuthToken()
  const res = await fetch(`${BACKEND_URL}/api/store${path}${toQueryString(options.query)}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    // Every response depends on the cart or the signed-in shopper.
    cache: "no-store",
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiRequestError(res.status, data?.message || `Request failed (${res.status})`)
  }
  return data as T
}

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message)
  }
}

import "server-only"

import { NextRequest, NextResponse } from "next/server"

import { ApiError, badRequest, unauthorized } from "./errors"
import { adminForToken } from "./services/admin"
import { customerIdForToken } from "./services/customers"

export const ADMIN_COOKIE = "_monsoon_admin"

type Ctx<P> = { params: Promise<P> }

/**
 * Wraps a route handler: runs it, returns its result as JSON, and turns
 * thrown errors into { message } with the right status code.
 */
export function route<P = Record<string, string>>(
  handler: (req: NextRequest, params: P) => unknown | Promise<unknown>
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const result = await handler(req, await ctx.params)
      if (result instanceof Response) return result
      return NextResponse.json(result ?? { ok: true })
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json({ message: err.message }, { status: err.status })
      }
      // SQLite constraint failures (e.g. a duplicate unique value) are the
      // client's fault, not a server crash.
      if ((err as { code?: string })?.code?.startsWith?.("SQLITE_CONSTRAINT")) {
        return NextResponse.json({ message: "That conflicts with existing data" }, { status: 409 })
      }
      console.error("[api]", req.method, req.nextUrl.pathname, err)
      return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
    }
  }
}

export async function readJson<T = Record<string, any>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw badRequest("Request body must be JSON")
  }
}

export const bearer = (req: NextRequest) => {
  const header = req.headers.get("authorization") ?? ""
  return header.startsWith("Bearer ") ? header.slice(7).trim() : null
}

/** The signed-in shopper's id, or null for guests. */
export const optionalCustomer = (req: NextRequest) => customerIdForToken(bearer(req))

export function requireCustomer(req: NextRequest) {
  const id = optionalCustomer(req)
  if (!id) throw unauthorized()
  return id
}

// Admin requests authenticate with the admin session, sent either as a bearer
// token (from the panel's server code) or the admin cookie (from the browser).
export function requireAdmin(req: NextRequest) {
  const admin = adminForToken(bearer(req) ?? req.cookies.get(ADMIN_COOKIE)?.value)
  if (!admin) throw unauthorized("Admin sign-in required")
  return admin
}

/** Query-string values as an array: ?tag_id=a&tag_id=b or ?tag_id[]=a */
export const queryList = (req: NextRequest, key: string) => {
  const values = [...req.nextUrl.searchParams.getAll(key), ...req.nextUrl.searchParams.getAll(`${key}[]`)]
  return values.flatMap((v) => v.split(",")).filter(Boolean)
}

export const queryInt = (req: NextRequest, key: string, fallback: number) => {
  const raw = req.nextUrl.searchParams.get(key)
  const n = raw === null || raw === "" ? NaN : Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback
}

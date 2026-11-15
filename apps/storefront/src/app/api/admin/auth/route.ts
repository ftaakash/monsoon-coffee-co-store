import { NextResponse } from "next/server"

import { ADMIN_COOKIE, bearer, readJson, route } from "@server/http"
import { adminLogin, adminLogout } from "@server/services/admin"

// Body: { email, password } -> { token }, and sets the admin cookie.
export const POST = route(async (req) => {
  const { email, password } = await readJson(req)
  const { token } = adminLogin(email, password)
  const res = NextResponse.json({ token })
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, sameSite: "strict", path: "/", maxAge: 12 * 3600 })
  return res
})

export const DELETE = route((req) => {
  adminLogout(bearer(req) ?? req.cookies.get(ADMIN_COOKIE)?.value)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: -1 })
  return res
})

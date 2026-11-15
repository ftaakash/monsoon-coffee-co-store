import { readJson, requireCustomer, route } from "@server/http"
import { hasPassword, setPassword } from "@server/services/customers"

export const GET = route((req) => ({ has_password: hasPassword(requireCustomer(req)) }))

// Body: { password, code }. The one-time code proves the shopper owns the email.
export const POST = route(async (req) => {
  const { password, code } = await readJson(req)
  setPassword(requireCustomer(req), password, code)
})

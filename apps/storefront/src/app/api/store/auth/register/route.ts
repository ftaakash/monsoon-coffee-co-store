import { readJson, route } from "@server/http"
import { register } from "@server/services/customers"

// Body: { email, password, first_name?, last_name?, phone? } -> { token, customer }
export const POST = route(async (req) => {
  const { email, password, first_name, last_name, phone } = await readJson(req)
  return register({ email, password, first_name, last_name, phone })
})

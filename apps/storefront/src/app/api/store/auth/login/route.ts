import { readJson, route } from "@server/http"
import { login } from "@server/services/customers"

// Body: { email, password } -> { token }
export const POST = route(async (req) => {
  const { email, password } = await readJson(req)
  return login(email, password)
})

import { readJson, route } from "@server/http"
import { verifyLoginCode } from "@server/services/customers"

// Body: { email, code } -> { token }
export const POST = route(async (req) => {
  const { email, code } = await readJson(req)
  return verifyLoginCode(email, code)
})

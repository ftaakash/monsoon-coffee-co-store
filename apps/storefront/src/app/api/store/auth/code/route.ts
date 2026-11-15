import { readJson, route } from "@server/http"
import { sendLoginCode } from "@server/services/customers"

// Body: { email } -> { email_masked }. "Sends" a one-time sign-in code.
export const POST = route(async (req) => sendLoginCode((await readJson(req)).email))

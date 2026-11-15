import { readJson, route } from "@server/http"
import { createContactMessage } from "@server/services/content"

// Body: { name, email, subject?, message }. Shows up in the admin inbox.
export const POST = route(async (req) => {
  const { name, email, subject, message } = await readJson(req)
  createContactMessage({ name, email, subject, message })
})

import { requireAdmin, route } from "@server/http"
import { listContactMessages } from "@server/services/content"

export const GET = route((req) => {
  requireAdmin(req)
  return { messages: listContactMessages() }
})

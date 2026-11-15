import { readJson, requireAdmin, route } from "@server/http"
import { setMessageStatus } from "@server/services/content"

// Body: { status: "new" | "read" }
export const POST = route<{ id: string }>(async (req, { id }) => {
  requireAdmin(req)
  setMessageStatus(id, (await readJson(req)).status)
})

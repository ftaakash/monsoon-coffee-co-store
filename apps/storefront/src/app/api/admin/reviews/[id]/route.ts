import { readJson, requireAdmin, route } from "@server/http"
import { setReviewStatus } from "@server/services/content"

// Body: { status: "published" | "rejected" }. Rejected reviews disappear from the store.
export const POST = route<{ id: string }>(async (req, { id }) => {
  requireAdmin(req)
  setReviewStatus(id, (await readJson(req)).status)
})

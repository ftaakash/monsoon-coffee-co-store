import { requireAdmin, route } from "@server/http"
import { listAllReviews } from "@server/services/content"

export const GET = route((req) => {
  requireAdmin(req)
  return { reviews: listAllReviews() }
})

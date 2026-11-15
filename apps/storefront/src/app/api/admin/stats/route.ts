import { requireAdmin, route } from "@server/http"
import { dashboardStats } from "@server/services/admin"

export const GET = route((req) => {
  requireAdmin(req)
  return dashboardStats()
})

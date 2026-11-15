import { requireAdmin, route } from "@server/http"
import { listCustomersForAdmin } from "@server/services/customers"

export const GET = route((req) => {
  requireAdmin(req)
  return { customers: listCustomersForAdmin() }
})

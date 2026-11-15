import { queryInt, requireAdmin, route } from "@server/http"
import { listAllOrders } from "@server/services/orders"

// ?status=not_fulfilled|shipped|out_for_delivery|delivered|canceled&q=email-or-#id
export const GET = route((req) => {
  requireAdmin(req)
  const params = req.nextUrl.searchParams
  return listAllOrders({
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
    limit: Math.min(queryInt(req, "limit", 50), 200),
    offset: queryInt(req, "offset", 0),
  })
})

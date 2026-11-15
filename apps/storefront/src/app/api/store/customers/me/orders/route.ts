import { queryInt, requireCustomer, route } from "@server/http"
import { listCustomerOrders } from "@server/services/orders"

export const GET = route((req) => ({
  orders: listCustomerOrders(requireCustomer(req), queryInt(req, "limit", 10), queryInt(req, "offset", 0)),
}))

import { optionalCustomer, route } from "@server/http"
import { cancelCustomerOrder } from "@server/services/orders"

export const POST = route<{ id: string }>((req, { id }) => ({ order: cancelCustomerOrder(id, optionalCustomer(req)) }))

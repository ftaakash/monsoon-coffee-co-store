import { optionalCustomer, route } from "@server/http"
import { acceptTransfer } from "@server/services/orders"

export const POST = route<{ id: string }>((req, { id }) => ({ order: acceptTransfer(id, optionalCustomer(req)) }))

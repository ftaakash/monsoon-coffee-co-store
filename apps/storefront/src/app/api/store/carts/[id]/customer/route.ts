import { requireCustomer, route } from "@server/http"
import { transferCart } from "@server/services/carts"

// Moves a guest cart onto the signed-in shopper's account.
export const POST = route<{ id: string }>((req, { id }) => ({ cart: transferCart(id, requireCustomer(req)) }))

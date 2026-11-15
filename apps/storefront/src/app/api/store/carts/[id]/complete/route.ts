import { route } from "@server/http"
import { completeCart } from "@server/services/carts"

// Places the order: reserves stock, writes the order, closes the cart.
export const POST = route<{ id: string }>((_req, { id }) => completeCart(id))

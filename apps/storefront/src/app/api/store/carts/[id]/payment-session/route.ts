import { route } from "@server/http"
import { initPaymentSession } from "@server/services/carts"

// Starts the (demo) payment for the cart's current total.
export const POST = route<{ id: string }>((_req, { id }) => ({ cart: initPaymentSession(id) }))

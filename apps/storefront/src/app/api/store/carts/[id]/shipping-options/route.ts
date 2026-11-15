import { route } from "@server/http"
import { listCartShippingOptions } from "@server/services/carts"

export const GET = route<{ id: string }>((_req, { id }) => ({ shipping_options: listCartShippingOptions(id) }))

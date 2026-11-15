import { route } from "@server/http"
import { listShippingOptions } from "@server/services/catalog"

export const GET = route(() => ({ shipping_options: listShippingOptions() }))

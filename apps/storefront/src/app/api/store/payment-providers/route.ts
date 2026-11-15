import { route } from "@server/http"
import { PAYMENT_PROVIDERS } from "@server/services/catalog"

export const GET = route(() => ({ payment_providers: PAYMENT_PROVIDERS }))

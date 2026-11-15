import { bearer, route } from "@server/http"
import { logout } from "@server/services/customers"

// Signs out: the session token stops working immediately.
export const DELETE = route((req) => {
  logout(bearer(req))
})

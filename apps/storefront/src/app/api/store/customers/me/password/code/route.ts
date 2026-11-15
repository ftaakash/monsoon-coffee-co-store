import { requireCustomer, route } from "@server/http"
import { sendPasswordCode } from "@server/services/customers"

export const POST = route((req) => sendPasswordCode(requireCustomer(req)))

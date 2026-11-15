import { readJson, requireCustomer, route } from "@server/http"
import { addAddress } from "@server/services/customers"

export const POST = route(async (req) => ({ customer: addAddress(requireCustomer(req), await readJson(req)) }))

import { readJson, requireCustomer, route } from "@server/http"
import { retrieveCustomer, updateCustomer } from "@server/services/customers"

export const GET = route((req) => ({ customer: retrieveCustomer(requireCustomer(req)) }))

// Body: { first_name?, last_name?, phone? }. Email is the login and can't change.
export const POST = route(async (req) => {
  const { first_name, last_name, phone } = await readJson(req)
  return { customer: updateCustomer(requireCustomer(req), { first_name, last_name, phone }) }
})

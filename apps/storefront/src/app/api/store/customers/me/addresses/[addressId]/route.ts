import { readJson, requireCustomer, route } from "@server/http"
import { deleteAddress, updateAddress } from "@server/services/customers"

export const POST = route<{ addressId: string }>(async (req, { addressId }) => ({
  customer: updateAddress(requireCustomer(req), addressId, await readJson(req)),
}))

export const DELETE = route<{ addressId: string }>((req, { addressId }) => ({
  customer: deleteAddress(requireCustomer(req), addressId),
}))

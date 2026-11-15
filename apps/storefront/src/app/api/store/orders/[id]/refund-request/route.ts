import { optionalCustomer, readJson, route } from "@server/http"
import { requestRefund } from "@server/services/orders"

// Body: { note? }
export const POST = route<{ id: string }>(async (req, { id }) => {
  const { note } = await readJson(req).catch(() => ({}) as Record<string, any>)
  return { order: requestRefund(id, optionalCustomer(req), note) }
})

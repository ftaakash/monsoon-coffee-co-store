import { readJson, requireAdmin, route } from "@server/http"
import { updateProduct } from "@server/services/admin"
import { retrieveProduct } from "@server/services/catalog"

export const GET = route<{ id: string }>((req, { id }) => {
  requireAdmin(req)
  return { product: retrieveProduct(id) }
})

export const POST = route<{ id: string }>(async (req, { id }) => {
  requireAdmin(req)
  return { product: updateProduct(id, await readJson(req)) }
})

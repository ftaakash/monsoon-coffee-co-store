import { readJson, route } from "@server/http"
import { deleteLineItem, updateLineItem } from "@server/services/carts"

// Body: { quantity }
export const POST = route<{ id: string; lineId: string }>(async (req, { id, lineId }) => {
  const { quantity } = await readJson(req)
  return { cart: updateLineItem(id, lineId, Number(quantity)) }
})

export const DELETE = route<{ id: string; lineId: string }>((_req, { id, lineId }) => ({
  cart: deleteLineItem(id, lineId),
}))

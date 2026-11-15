import { route } from "@server/http"
import { notFound } from "@server/errors"
import { retrieveProduct } from "@server/services/catalog"

export const GET = route<{ id: string }>((_req, { id }) => {
  const product = retrieveProduct(id)
  if (product.status !== "published") throw notFound("Product not found")
  return { product }
})

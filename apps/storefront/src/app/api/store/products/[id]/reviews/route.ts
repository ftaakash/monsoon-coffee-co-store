import { optionalCustomer, readJson, route } from "@server/http"
import { createReview, listProductReviews } from "@server/services/content"

export const GET = route<{ id: string }>((_req, { id }) => listProductReviews(id))

// Body: { rating, body, title?, variant_id?, images?: string[] }
export const POST = route<{ id: string }>(async (req, { id }) => {
  const body = await readJson(req)
  return {
    review: createReview(optionalCustomer(req), {
      product_id: id,
      variant_id: body.variant_id,
      rating: body.rating,
      title: body.title,
      body: body.body,
      images: body.images,
    }),
  }
})

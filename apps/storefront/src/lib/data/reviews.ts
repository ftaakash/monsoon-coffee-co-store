"use server"

import { revalidatePath } from "next/cache"
import { storeApi } from "./api"
import { getAuthToken } from "./cookies"

export type Review = {
  id: string
  product_id: string
  customer_id?: string | null
  customer_name?: string | null
  variant_id?: string | null
  variant_title?: string | null
  rating: number
  title?: string | null
  body: string
  images?: string[] | null
  status: "pending" | "published" | "rejected"
  created_at: string
}

export type ReviewSummary = {
  count: number
  average_rating: number
}

export type ListReviewsResult = {
  reviews: Review[]
  summary: ReviewSummary
}

export async function listProductReviews(
  productId: string
): Promise<ListReviewsResult> {
  return storeApi<ListReviewsResult>(`/products/${productId}/reviews`).catch(() => ({
    reviews: [],
    summary: { count: 0, average_rating: 0 },
  }))
}

// Each image is either an already-hosted URL, or a fresh upload encoded as
// base64 with its MIME type. Uploads are stored inline as data URLs.
export type ReviewImageInput =
  | { url: string }
  | { data: string; mime: string; name?: string }

export type CreateReviewInput = {
  product_id: string
  variant_id?: string | null
  rating: number
  title?: string | null
  body: string
  images?: ReviewImageInput[]
  productHandle?: string
}

export type CreateReviewResult =
  | { ok: true; review?: Review }
  | { ok: false; error: string; needsAuth?: boolean }

export async function createProductReview(
  input: CreateReviewInput
): Promise<CreateReviewResult> {
  if (!(await getAuthToken())) {
    return { ok: false, error: "Sign in to leave a review.", needsAuth: true }
  }

  try {
    const { review } = await storeApi<{ review: Review }>(
      `/products/${input.product_id}/reviews`,
      {
        method: "POST",
        body: {
          variant_id: input.variant_id,
          rating: input.rating,
          title: input.title,
          body: input.body,
          images: (input.images ?? []).map((img) =>
            "url" in img ? img.url : `data:${img.mime};base64,${img.data}`
          ),
        },
      }
    )
    if (input.productHandle) {
      revalidatePath(`/[countryCode]/(main)/products/${input.productHandle}`, "page")
    }
    return { ok: true, review }
  } catch (e: any) {
    const msg: string = e?.message || "Could not submit review. Please try again."
    return {
      ok: false,
      error: msg,
      needsAuth: /unauthorized|401|sign in/i.test(msg),
    }
  }
}

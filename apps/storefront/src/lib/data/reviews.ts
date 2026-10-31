"use server"

import { revalidatePath } from "next/cache"
import { mockReviews } from "@lib/mock/db"
import { getCustomerId } from "./cookies"

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
  return mockReviews.list(productId)
}

// Each image is either an already-hosted URL, or a fresh upload encoded as
// base64 with its MIME type. Uploads are kept inline as data URLs.
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
  const customerId = await getCustomerId()
  if (!customerId) {
    return { ok: false, error: "Sign in to leave a review.", needsAuth: true }
  }

  try {
    const review = mockReviews.create(customerId, {
      product_id: input.product_id,
      variant_id: input.variant_id,
      rating: input.rating,
      title: input.title,
      body: input.body,
      images: (input.images ?? []).map((img) =>
        "url" in img ? img.url : `data:${img.mime};base64,${img.data}`
      ),
    })
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

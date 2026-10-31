import "server-only"
import { revalidatePath } from "next/cache"

/**
 * Re-render every storefront page after a cart/account/order change, so a
 * server action's response carries the fresh cart, totals and badges.
 * Next.js forbids revalidation during render (the checkout page mutates the
 * cart while rendering), where this is a no-op.
 */
export const revalidateStorefront = () => {
  try {
    revalidatePath("/", "layout")
  } catch {
    // Called during render — the page being rendered already reads fresh data.
  }
}

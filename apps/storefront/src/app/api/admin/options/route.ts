import { requireAdmin, route } from "@server/http"
import { IMAGE_LIBRARY, listFormOptions } from "@server/services/admin"

// Choices for the product form: categories, collections, tags and images.
export const GET = route((req) => {
  requireAdmin(req)
  return { ...listFormOptions(), images: IMAGE_LIBRARY }
})

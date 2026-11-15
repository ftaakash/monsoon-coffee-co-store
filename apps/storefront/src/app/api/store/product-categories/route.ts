import { route } from "@server/http"
import { listCategories } from "@server/services/catalog"

export const GET = route(() => ({ product_categories: listCategories() }))

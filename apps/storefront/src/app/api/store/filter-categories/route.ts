import { route } from "@server/http"
import { listFilterCategories } from "@server/services/catalog"

export const GET = route(() => ({ filter_categories: listFilterCategories() }))

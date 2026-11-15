import { queryList, readJson, requireAdmin, route } from "@server/http"
import { createProduct } from "@server/services/admin"
import { listProducts } from "@server/services/catalog"

// Drafts included. ?q=… searches title and description.
export const GET = route((req) => {
  requireAdmin(req)
  return listProducts({
    include_drafts: true,
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    category_id: queryList(req, "category_id"),
    limit: 100,
  })
})

// Body: product fields + { variant: { title, option_title, price, original_price?, manage_inventory, stock? } }
export const POST = route(async (req) => {
  requireAdmin(req)
  return { product: createProduct(await readJson(req)) }
})

import { queryInt, queryList, route } from "@server/http"
import { listProducts } from "@server/services/catalog"

// GET /api/store/products?category_id=…&tag_id=…&collection_id=…&q=…&limit=12&offset=0
export const GET = route((req) =>
  listProducts({
    id: queryList(req, "id"),
    handle: queryList(req, "handle"),
    category_id: queryList(req, "category_id"),
    collection_id: queryList(req, "collection_id"),
    tag_id: queryList(req, "tag_id"),
    q: req.nextUrl.searchParams.get("q") ?? undefined,
    limit: Math.min(queryInt(req, "limit", 12), 100),
    offset: queryInt(req, "offset", 0),
  })
)

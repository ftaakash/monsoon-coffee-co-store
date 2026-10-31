"use server"

import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { listAllProducts } from "@lib/mock/db"
import { getRegion, retrieveRegion } from "./regions"

type ProductQuery = HttpTypes.FindParams &
  HttpTypes.StoreProductListParams & {
    tag_id?: string | string[]
  }

const asArray = (v: unknown): string[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]

// Applies the subset of Medusa's /store/products filters the storefront uses.
// Within one filter values are OR'd; across filters they are AND'd.
function filterProducts(
  products: HttpTypes.StoreProduct[],
  query: ProductQuery = {}
) {
  const ids = asArray(query.id)
  const handles = asArray(query.handle)
  const categoryIds = asArray(query.category_id)
  const collectionIds = asArray(query.collection_id)
  const tagIds = asArray(query.tag_id)
  const q = typeof query.q === "string" ? query.q.toLowerCase() : ""

  return products.filter((p) => {
    if (ids.length && !ids.includes(p.id)) return false
    if (handles.length && !handles.includes(p.handle ?? "")) return false
    if (
      categoryIds.length &&
      !p.categories?.some((c) => categoryIds.includes(c.id))
    )
      return false
    if (collectionIds.length && !collectionIds.includes(p.collection_id ?? ""))
      return false
    if (tagIds.length && !p.tags?.some((t) => tagIds.includes(t.id)))
      return false
    if (
      q &&
      !`${p.title} ${p.description ?? ""}`.toLowerCase().includes(q)
    )
      return false
    return true
  })
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductQuery
  countryCode?: string
  regionId?: string
  noCache?: boolean
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductQuery
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = Number(queryParams?.limit) || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  const region = countryCode
    ? await getRegion(countryCode)
    : await retrieveRegion(regionId!)

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  // Newest first, matching the backend's default ordering.
  const matching = sortProducts(
    filterProducts(listAllProducts(), queryParams),
    "created_at"
  )
  const count = matching.length
  const products = matching.slice(offset, offset + limit)
  const nextPage = count > offset + limit ? pageParam + 1 : null

  return {
    response: { products, count },
    nextPage,
    queryParams,
  }
}

/**
 * Returns every matching product sorted by `sortBy`, then the requested page.
 */
export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
}: {
  page?: number
  queryParams?: ProductQuery
  sortBy?: SortOptions
  countryCode: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductQuery
}> => {
  const limit = Number(queryParams?.limit) || 12
  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const nextPage = count > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count,
    },
    nextPage,
    queryParams,
  }
}

"use server"

import { sortProducts } from "@lib/util/sort-products"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { storeApi } from "./api"
import { getRegion, retrieveRegion } from "./regions"

type ProductQuery = HttpTypes.FindParams &
  HttpTypes.StoreProductListParams & {
    tag_id?: string | string[]
  }

const asArray = (v: unknown): string[] =>
  v === undefined || v === null ? [] : Array.isArray(v) ? v.map(String) : [String(v)]

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

  // The API filters and returns products newest first.
  const { products, count } = await storeApi<{
    products: HttpTypes.StoreProduct[]
    count: number
  }>("/products", {
    query: {
      id: asArray(queryParams?.id),
      handle: asArray(queryParams?.handle),
      category_id: asArray(queryParams?.category_id),
      collection_id: asArray(queryParams?.collection_id),
      tag_id: asArray(queryParams?.tag_id),
      q: typeof queryParams?.q === "string" ? queryParams.q : undefined,
      limit,
      offset,
    },
  })
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

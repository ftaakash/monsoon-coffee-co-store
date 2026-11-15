import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"

const fetchCategories = async () =>
  (await storeApi<{ product_categories: HttpTypes.StoreProductCategory[] }>("/product-categories"))
    .product_categories

export const listCategories = async (query?: Record<string, unknown>) => {
  const limit = (query?.limit as number | undefined) || 100
  return (await fetchCategories()).slice(0, limit)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = categoryHandle.join("/")
  return (await fetchCategories()).find((c) => c.handle === handle)
}

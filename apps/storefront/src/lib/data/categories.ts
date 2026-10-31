import { HttpTypes } from "@medusajs/types"
import { CATEGORIES } from "@lib/mock/catalog"
import { listAllProducts } from "@lib/mock/db"

const withProducts = (category: (typeof CATEGORIES)[number]) =>
  ({
    ...category,
    products: listAllProducts().filter((p) =>
      p.categories?.some((c) => c.id === category.id)
    ),
  }) as unknown as HttpTypes.StoreProductCategory

export const listCategories = async (query?: Record<string, unknown>) => {
  const limit = (query?.limit as number | undefined) || 100
  return CATEGORIES.slice(0, limit).map(withProducts)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  const handle = `${categoryHandle.join("/")}`
  const category = CATEGORIES.find((c) => c.handle === handle)
  return category ? withProducts(category) : undefined
}

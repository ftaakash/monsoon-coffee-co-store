"use server"

import { storeApi } from "./api"

export type BrewParamSchemaItem = {
  key: string
  label: string
  unit?: string
}

export type BrewStep = {
  name: string
  description: string
}

export type BrewMethod = {
  id: string
  slug: string
  name: string
  method_label?: string | null
  summary?: string | null
  image_url?: string | null
  param_schema?: BrewParamSchemaItem[] | null
  steps?: BrewStep[] | null
  position?: number
}

export type BrewRecipe = {
  id: string
  product_id: string
  title?: string | null
  summary?: string | null
  params?: Record<string, string> | null
  steps?: BrewStep[] | null
  brew_method: BrewMethod
}

export async function listProductBrews(productId: string): Promise<BrewRecipe[]> {
  return storeApi<{ brews: BrewRecipe[] }>(`/products/${productId}/brews`)
    .then((r) => r.brews)
    .catch(() => [])
}

/**
 * Whether the brew lab section should render for a product: true when it sits
 * in a category flagged show_brew_lab (Coffee Beans, Ground Coffee).
 */
export async function isBrewLabEnabledForProduct(product: {
  categories?: Array<{ id?: string | null; show_brew_lab?: boolean | null }> | null
}): Promise<boolean> {
  return (product.categories ?? []).some(
    (c) => !!c?.show_brew_lab
  )
}

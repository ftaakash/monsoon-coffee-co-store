"use server"

import { BREWS, BREW_LAB_CATEGORY_IDS } from "@lib/mock/catalog"

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
  return BREWS[productId] ?? []
}

/**
 * Whether the brew lab section should render for a product: true when it sits
 * in one of the coffee categories.
 */
export async function isBrewLabEnabledForProduct(product: {
  categories?: Array<{ id?: string | null; handle?: string | null }> | null
}): Promise<boolean> {
  return (product.categories ?? []).some(
    (c) => !!c?.id && BREW_LAB_CATEGORY_IDS.includes(c.id)
  )
}

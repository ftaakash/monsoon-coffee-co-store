"use server"

import { FILTER_CATEGORIES } from "@lib/mock/catalog"

export type StoreFilterTag = {
  id: string
  value: string
}

export type StoreFilterCategory = {
  id: string
  name: string
  handle: string
  rank: number
  tags: StoreFilterTag[]
}

export const listFilterCategories = async (): Promise<StoreFilterCategory[]> =>
  FILTER_CATEGORIES

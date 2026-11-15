"use server"

import { storeApi } from "./api"

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
  (await storeApi<{ filter_categories: StoreFilterCategory[] }>("/filter-categories"))
    .filter_categories

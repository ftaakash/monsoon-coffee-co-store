"use server"

import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"

const fetchCollections = async () =>
  (await storeApi<{ collections: HttpTypes.StoreCollection[] }>("/collections")).collections

export const retrieveCollection = async (id: string) => {
  const collection = (await fetchCollections()).find((c) => c.id === id)
  if (!collection) throw new Error(`Collection with id ${id} not found`)
  return collection
}

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const limit = Number(queryParams.limit || 100)
  const offset = Number(queryParams.offset || 0)
  const collections = (await fetchCollections()).slice(offset, offset + limit)
  return { collections, count: collections.length }
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection | null> =>
  (await fetchCollections()).find((c) => c.handle === handle) ?? null

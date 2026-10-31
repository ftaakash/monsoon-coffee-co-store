"use server"

import { HttpTypes } from "@medusajs/types"
import { COLLECTIONS } from "@lib/mock/catalog"
import { listAllProducts } from "@lib/mock/db"

const withProducts = (collection: (typeof COLLECTIONS)[number]) =>
  ({
    ...collection,
    products: listAllProducts().filter((p) => p.collection_id === collection.id),
  }) as unknown as HttpTypes.StoreCollection

export const retrieveCollection = async (id: string) => {
  const collection = COLLECTIONS.find((c) => c.id === id)
  if (!collection) throw new Error(`Collection with id ${id} not found`)
  return withProducts(collection)
}

export const listCollections = async (
  queryParams: Record<string, string> = {}
): Promise<{ collections: HttpTypes.StoreCollection[]; count: number }> => {
  const limit = Number(queryParams.limit || 100)
  const offset = Number(queryParams.offset || 0)
  const collections = COLLECTIONS.slice(offset, offset + limit).map(withProducts)
  return { collections, count: collections.length }
}

export const getCollectionByHandle = async (
  handle: string
): Promise<HttpTypes.StoreCollection | null> => {
  const collection = COLLECTIONS.find((c) => c.handle === handle)
  return collection ? withProducts(collection) : null
}

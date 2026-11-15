"use server"

import { HttpTypes } from "@medusajs/types"
import { storeApi } from "./api"

export const listRegions = async (): Promise<HttpTypes.StoreRegion[]> =>
  (await storeApi<{ regions: HttpTypes.StoreRegion[] }>("/regions")).regions

export const retrieveRegion = async (id: string) => {
  const region = (await listRegions()).find((r) => r.id === id)
  if (!region) throw new Error(`Region with id ${id} not found`)
  return region
}

export const getRegion = async (countryCode: string) => {
  const code = (countryCode || "in").toLowerCase()
  return (await listRegions()).find((r) => r.countries?.some((c) => c.iso_2 === code)) ?? null
}

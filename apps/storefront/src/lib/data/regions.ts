"use server"

import { HttpTypes } from "@medusajs/types"
import { REGIONS } from "@lib/mock/catalog"

export const listRegions = async (): Promise<HttpTypes.StoreRegion[]> => REGIONS

export const retrieveRegion = async (id: string) => {
  const region = REGIONS.find((r) => r.id === id)
  if (!region) throw new Error(`Region with id ${id} not found`)
  return region
}

export const getRegion = async (countryCode: string) => {
  const code = (countryCode || "in").toLowerCase()
  return (
    REGIONS.find((r) => r.countries?.some((c) => c.iso_2 === code)) ?? null
  )
}

"use server"

import { HttpTypes } from "@medusajs/types"
import { redirect } from "next/navigation"
import { storeApi } from "./api"
import {
  getAuthToken,
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
} from "./cookies"
import { revalidateStorefront } from "./revalidate"

type CustomerResponse = { customer: HttpTypes.StoreCustomer }

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    // Guests have no session token, so there's nothing to ask the API.
    if (!(await getAuthToken())) return null
    return storeApi<CustomerResponse>("/customers/me")
      .then((r) => r.customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const { customer } = await storeApi<CustomerResponse>("/customers/me", {
    method: "POST",
    body: {
      first_name: body.first_name ?? undefined,
      last_name: body.last_name ?? undefined,
      phone: body.phone ?? undefined,
    },
  })
  revalidateStorefront()
  return customer
}

export async function signup(_currentState: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  try {
    const { token, customer } = await storeApi<{
      token: string
      customer: HttpTypes.StoreCustomer
    }>("/auth/register", { method: "POST", body: { ...customerForm, password } })
    await setAuthToken(token)
    await transferCart()

    return customer
  } catch (error) {
    return String(error)
  }
}

export async function login(_currentState: unknown, formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  try {
    const { token } = await storeApi<{ token: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
    })
    await setAuthToken(token)
  } catch (error) {
    return String(error)
  }

  try {
    await transferCart()
  } catch (error) {
    return String(error)
  }
}

export async function signout(countryCode: string) {
  // Ends the session on the server too, so the old token stops working.
  await storeApi("/auth/session", { method: "DELETE" }).catch(() => {})

  await removeAuthToken()
  await removeCartId()
  revalidateStorefront()

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (cartId && (await getAuthToken())) {
    await storeApi(`/carts/${cartId}/customer`, { method: "POST" })
  }
  revalidateStorefront()
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const isDefaultBilling =
    formData.get("is_default_billing") === "on" ||
    formData.get("is_default_billing") === "true" ||
    (currentState.isDefaultBilling as boolean) ||
    false
  const isDefaultShipping =
    formData.get("is_default_shipping") === "on" ||
    formData.get("is_default_shipping") === "true" ||
    (currentState.isDefaultShipping as boolean) ||
    false

  const address = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
    phone: formData.get("phone") as string,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  try {
    await storeApi("/customers/me/addresses", { method: "POST", body: address })
    revalidateStorefront()
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  try {
    await storeApi(`/customers/me/addresses/${addressId}`, { method: "DELETE" })
    revalidateStorefront()
  } catch {
    // Already gone, or signed out — nothing to delete.
  }
}

type DefaultShippingPayload = {
  first_name: string
  last_name: string
  address_1: string
  address_2?: string
  city: string
  postal_code: string
  province?: string
  country_code: string
  phone?: string
  company?: string
}

const sameAddress = (
  a: HttpTypes.StoreCustomerAddress | null | undefined,
  b: DefaultShippingPayload
) => {
  if (!a) return false
  const norm = (s?: string | null) => (s ?? "").trim().toLowerCase()
  return (
    norm(a.address_1) === norm(b.address_1) &&
    norm(a.postal_code) === norm(b.postal_code) &&
    norm(a.city) === norm(b.city) &&
    norm(a.country_code) === norm(b.country_code)
  )
}

export const upsertDefaultShippingAddress = async (
  payload: DefaultShippingPayload
): Promise<{ success: boolean; error: string | null }> => {
  const customer = await retrieveCustomer()
  if (!customer) {
    return { success: false, error: "Not authenticated" }
  }

  try {
    const existing = customer.addresses?.find((a) => sameAddress(a, payload))

    if (existing) {
      if (!existing.is_default_shipping) {
        await storeApi(`/customers/me/addresses/${existing.id}`, {
          method: "POST",
          body: { is_default_shipping: true },
        })
      }
    } else {
      await storeApi("/customers/me/addresses", {
        method: "POST",
        body: {
          ...payload,
          address_2: payload.address_2 || "",
          province: payload.province || "",
          phone: payload.phone || "",
          company: payload.company || "",
          is_default_shipping: true,
          is_default_billing: !customer.addresses?.some(
            (a) => a.is_default_billing
          ),
        },
      })
    }

    revalidateStorefront()
    return { success: true, error: null }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<{ success: boolean; error: string | null }> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const address: Record<string, unknown> = {
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    company: formData.get("company") as string,
    address_1: formData.get("address_1") as string,
    address_2: formData.get("address_2") as string,
    city: formData.get("city") as string,
    postal_code: formData.get("postal_code") as string,
    province: formData.get("province") as string,
    country_code: formData.get("country_code") as string,
  }

  const phone = formData.get("phone") as string

  if (phone) {
    address.phone = phone
  }

  const rawDefaultShipping = formData.get("is_default_shipping")
  if (rawDefaultShipping !== null) {
    address.is_default_shipping =
      rawDefaultShipping === "on" || rawDefaultShipping === "true"
  }
  const rawDefaultBilling = formData.get("is_default_billing")
  if (rawDefaultBilling !== null) {
    address.is_default_billing =
      rawDefaultBilling === "on" || rawDefaultBilling === "true"
  }

  try {
    await storeApi(`/customers/me/addresses/${addressId}`, { method: "POST", body: address })
    revalidateStorefront()
    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

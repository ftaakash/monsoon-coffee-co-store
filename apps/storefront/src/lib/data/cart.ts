"use server"

import { HttpTypes } from "@medusajs/types"
import { redirect } from "next/navigation"
import { SHIPPING_OPTIONS } from "@lib/mock/catalog"
import { mockCart } from "@lib/mock/db"
import { getCartId, getCustomerId, removeCartId, setCartId } from "./cookies"
import { getRegion } from "./regions"
import { revalidateStorefront } from "./revalidate"

/**
 * Retrieves a cart by its ID. If no ID is provided, it will use the cart ID from the cookies.
 * @param cartId - optional - The ID of the cart to retrieve.
 * @returns The cart object if found, or null if not found.
 */
export async function retrieveCart(
  cartId?: string,
  _fields?: string,
  _opts?: { noCache?: boolean }
) {
  const id = cartId || (await getCartId())

  if (!id) {
    return null
  }

  return mockCart.retrieve(id)
}

export async function getOrSetCart(countryCode: string) {
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  let cart = await retrieveCart()

  // A completed cart (order already placed) can't accept new line items.
  if (cart?.completed_at) {
    await removeCartId()
    cart = null
  }

  if (!cart) {
    cart = mockCart.create(region.id, await getCustomerId())
    await setCartId(cart.id)
    revalidateStorefront()
  }

  if (cart.region_id !== region.id) {
    cart = mockCart.update(cart.id, { region_id: region.id })
  }

  return cart
}

export async function updateCart(data: HttpTypes.StoreUpdateCart) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found, please create one before updating")
  }

  const cart = mockCart.update(
    cartId,
    data as Parameters<typeof mockCart.update>[1]
  )
  revalidateStorefront()
  return cart
}

export async function addToCart({
  variantId,
  quantity,
  countryCode,
}: {
  variantId: string
  quantity: number
  countryCode: string
}) {
  if (!variantId) {
    throw new Error("Missing variant ID when adding to cart")
  }

  const cart = await getOrSetCart(countryCode)

  if (!cart) {
    throw new Error("Error retrieving or creating cart")
  }

  mockCart.addItem(cart.id, variantId, quantity)
  revalidateStorefront()
}

export type CartInventoryIssue = {
  lineId: string
  title: string
  requested: number
  available: number
}

export type ValidateCartInventoryResult =
  | { ok: true }
  | { ok: false; issues: CartInventoryIssue[] }

/**
 * Re-checks every line item in the cart against current inventory, so a stale
 * cart is caught before the customer pays.
 */
export async function validateCartInventory(
  cartId?: string
): Promise<ValidateCartInventoryResult> {
  const cart = await retrieveCart(cartId)

  if (!cart?.items?.length) {
    return { ok: true }
  }

  const issues: CartInventoryIssue[] = []
  for (const item of cart.items) {
    const variant = item.variant
    if (!variant?.manage_inventory || variant.allow_backorder) continue

    const available = variant.inventory_quantity ?? 0
    if (item.quantity > available) {
      issues.push({
        lineId: item.id,
        title: item.product_title ?? item.title ?? "An item in your cart",
        requested: item.quantity,
        available,
      })
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true }
}

export async function updateLineItem({
  lineId,
  quantity,
}: {
  lineId: string
  quantity: number
}) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when updating line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when updating line item")
  }

  mockCart.updateItem(cartId, lineId, quantity)
  revalidateStorefront()
}

export async function deleteLineItem(lineId: string) {
  if (!lineId) {
    throw new Error("Missing lineItem ID when deleting line item")
  }

  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("Missing cart ID when deleting line item")
  }

  mockCart.deleteItem(cartId, lineId)
  revalidateStorefront()
}

// Selecting one option replaces the method for that option's shipping profile
// and keeps methods for any other profile (e.g. an event ticket).
export async function setShippingMethod({
  cartId,
  shippingMethodId,
}: {
  cartId: string
  shippingMethodId: string
}) {
  const cart = mockCart.retrieve(cartId)
  const profileOf = (id?: string | null) =>
    SHIPPING_OPTIONS.find((o) => o.id === id)?.shipping_profile_id
  const profile = profileOf(shippingMethodId)
  const kept = (cart?.shipping_methods ?? [])
    .map((m) => m.shipping_option_id)
    .filter((id): id is string => !!id && profileOf(id) !== profile)

  mockCart.setShippingMethods(cartId, [...kept, shippingMethodId])
  revalidateStorefront()
}

// Set ALL of a cart's shipping methods at once — one per shipping profile.
export async function setShippingMethods({
  cartId,
  optionIds,
}: {
  cartId: string
  optionIds: string[]
}) {
  mockCart.setShippingMethods(cartId, optionIds)
  revalidateStorefront()
}

export async function initiatePaymentSession(
  cart: HttpTypes.StoreCart,
  _data: HttpTypes.StoreInitializePaymentSession
) {
  const updated = mockCart.initPaymentSession(cart.id)
  revalidateStorefront()
  return { payment_collection: updated.payment_collection }
}

export async function applyPromotions(codes: string[]) {
  const cartId = await getCartId()

  if (!cartId) {
    throw new Error("No existing cart found")
  }

  mockCart.update(cartId, { promo_codes: codes })
  revalidateStorefront()
}

export async function applyGiftCard(_code: string) {}

export async function removeDiscount(_code: string) {}

export async function removeGiftCard(
  _codeToRemove: string,
  _giftCards: unknown[]
) {}

export async function submitPromotionForm(
  currentState: unknown,
  formData: FormData
) {
  const code = formData.get("code") as string
  try {
    await applyPromotions([code])
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e)
  }
}

// TODO: Pass a POJO instead of a form entity here
export async function setAddresses(currentState: unknown, formData: FormData) {
  try {
    if (!formData) {
      throw new Error("No form data found when setting addresses")
    }

    const read = (prefix: string) => ({
      first_name: formData.get(`${prefix}.first_name`),
      last_name: formData.get(`${prefix}.last_name`),
      address_1: formData.get(`${prefix}.address_1`),
      address_2: "",
      company: formData.get(`${prefix}.company`),
      postal_code: formData.get(`${prefix}.postal_code`),
      city: formData.get(`${prefix}.city`),
      country_code: formData.get(`${prefix}.country_code`),
      province: formData.get(`${prefix}.province`),
      phone: formData.get(`${prefix}.phone`),
    })

    const shipping_address = read("shipping_address")
    const sameAsBilling = formData.get("same_as_billing") === "on"

    await updateCart({
      email: formData.get("email") as string,
      shipping_address,
      billing_address: sameAsBilling ? shipping_address : read("billing_address"),
    } as HttpTypes.StoreUpdateCart)
  } catch (e: unknown) {
    return e instanceof Error ? e.message : String(e)
  }

  redirect(
    `/${formData.get("shipping_address.country_code")}/checkout?step=delivery`
  )
}

/**
 * Completes a cart into an order without redirecting. Returns the raw
 * completion response so callers can decide how to navigate.
 */
export async function completeCart(cartId?: string) {
  const id = cartId || (await getCartId())

  if (!id) {
    throw new Error("No existing cart found when placing an order")
  }

  const cartRes = mockCart.complete(id)
  await removeCartId()
  revalidateStorefront()
  return cartRes
}

export async function placeOrder(cartId?: string) {
  const cartRes = await completeCart(cartId)

  const countryCode =
    cartRes.order.shipping_address?.country_code?.toLowerCase() || "in"

  // Send to the public order-confirmation page — guests check out too.
  redirect(`/${countryCode}/order/${cartRes.order.id}/confirmed`)
}

/**
 * Switches the cart to the region for `countryCode` and redirects there.
 */
export async function updateRegion(countryCode: string, currentPath: string) {
  const cartId = await getCartId()
  const region = await getRegion(countryCode)

  if (!region) {
    throw new Error(`Region not found for country code: ${countryCode}`)
  }

  if (cartId) {
    await updateCart({ region_id: region.id })
  }

  redirect(`/${countryCode}${currentPath}`)
}

export async function listCartOptions() {
  return { shipping_options: SHIPPING_OPTIONS }
}

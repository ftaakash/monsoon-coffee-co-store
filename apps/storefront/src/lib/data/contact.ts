"use server"

import { storeApi } from "./api"

export type ActionResult = { ok: boolean; error?: string }

// Submit the storefront "Contact Us" form. Messages are saved by the API and
// appear in the admin panel's inbox.
export async function sendContactMessage(input: {
  name: string
  email: string
  subject?: string
  message: string
}): Promise<ActionResult> {
  try {
    await storeApi("/contact", { method: "POST", body: input })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Idempotent newsletter signup.
export async function subscribeNewsletter(
  email: string
): Promise<ActionResult> {
  try {
    await storeApi("/newsletter", { method: "POST", body: { email } })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

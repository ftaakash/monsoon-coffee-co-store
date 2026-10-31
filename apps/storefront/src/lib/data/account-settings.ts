"use server"

import { mockCustomers } from "@lib/mock/db"
import { getCustomerId } from "./cookies"
import { revalidateStorefront } from "./revalidate"

export type SettingsResult = { ok: boolean; error?: string }

// Update editable profile fields. Email is intentionally not editable here — it
// is the identifier the login is keyed on.
export async function updateAccountProfile(input: {
  first_name?: string
  last_name?: string
  phone?: string
}): Promise<SettingsResult> {
  try {
    mockCustomers.update(await getCustomerId(), input)
    revalidateStorefront()
    return { ok: true }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Could not update your details. Please try again.",
    }
  }
}

// "Email" a verification code the customer must enter to set/change a
// password. In this demo build the code is always DEMO_OTP (123456).
export async function sendPasswordOtp(): Promise<
  SettingsResult & { emailMasked?: string }
> {
  try {
    return {
      ok: true,
      emailMasked: mockCustomers.maskedEmail(await getCustomerId()),
    }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Could not send the code. Please try again.",
    }
  }
}

// Set or change the account password. Requires the verification code.
export async function setAccountPassword(
  password: string,
  code: string
): Promise<SettingsResult> {
  try {
    mockCustomers.setPassword(await getCustomerId(), password, code)
    revalidateStorefront()
    return { ok: true }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Could not set your password. Please try again.",
    }
  }
}

// Whether the account already has a password (for "Set" vs "Change" labelling).
export async function getAccountPasswordStatus(): Promise<boolean> {
  try {
    return mockCustomers.hasPassword(await getCustomerId())
  } catch {
    return false
  }
}

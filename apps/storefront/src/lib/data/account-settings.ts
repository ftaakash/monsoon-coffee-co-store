"use server"

import { storeApi } from "./api"
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
    await storeApi("/customers/me", { method: "POST", body: input })
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
// password. With no email service the code is always 123456.
export async function sendPasswordOtp(): Promise<
  SettingsResult & { emailMasked?: string }
> {
  try {
    const { email_masked } = await storeApi<{ email_masked: string }>(
      "/customers/me/password/code",
      { method: "POST" }
    )
    return { ok: true, emailMasked: email_masked }
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
    await storeApi("/customers/me/password", { method: "POST", body: { password, code } })
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
    return (await storeApi<{ has_password: boolean }>("/customers/me/password")).has_password
  } catch {
    return false
  }
}

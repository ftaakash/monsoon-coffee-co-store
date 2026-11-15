"use server"

import { storeApi } from "./api"
import { setAuthToken } from "./cookies"
import { transferCart } from "./customer"

export type SendLoginOtpResult = {
  ok: boolean
  emailMasked?: string
  error?: string
}
export type VerifyLoginOtpResult = { ok: boolean; error?: string }

// "Email" a login code to an existing account. There is no email service in
// this project, so the code is always 123456 (see services/customers.ts).
export async function sendLoginOtp(email: string): Promise<SendLoginOtpResult> {
  const trimmed = (email ?? "").trim()
  if (!trimmed) return { ok: false, error: "Enter your email." }

  try {
    const { email_masked } = await storeApi<{ email_masked: string }>("/auth/code", {
      method: "POST",
      body: { email: trimmed },
    })
    return { ok: true, emailMasked: email_masked }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Could not send the code. Please try again.",
    }
  }
}

// Verify a login code, then sign the shopper in and move their guest cart onto
// the account — exactly like the password login does.
export async function verifyLoginOtp(
  email: string,
  code: string
): Promise<VerifyLoginOtpResult> {
  const trimmed = (email ?? "").trim()

  try {
    const { token } = await storeApi<{ token: string }>("/auth/code/verify", {
      method: "POST",
      body: { email: trimmed, code },
    })
    await setAuthToken(token)

    try {
      await transferCart()
    } catch {
      // Non-fatal: the shopper is signed in even if cart transfer hiccups.
    }

    return { ok: true }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || "Could not verify the code. Please try again.",
    }
  }
}

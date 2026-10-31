"use server"

import { mockAuth } from "@lib/mock/db"
import { setAuthToken } from "./cookies"
import { transferCart } from "./customer"

export type SendLoginOtpResult = {
  ok: boolean
  emailMasked?: string
  error?: string
}
export type VerifyLoginOtpResult = { ok: boolean; error?: string }

// "Email" a login code to an existing account. In this demo build no email is
// sent — the code is always DEMO_OTP (123456).
export async function sendLoginOtp(email: string): Promise<SendLoginOtpResult> {
  const trimmed = (email ?? "").trim()
  if (!trimmed) return { ok: false, error: "Enter your email." }

  try {
    return { ok: true, emailMasked: mockAuth.sendOtp(trimmed) }
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
    await setAuthToken(mockAuth.verifyOtp(trimmed, code))

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

"use client"

import { useState, useTransition } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"

import { sendLoginOtp, verifyLoginOtp } from "@lib/data/auth-otp"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import {
  CTAButton,
  OutlineButton,
} from "@modules/common/components/monsoon/buttons"

type Props = {
  registerHref?: string
  onUsePassword?: () => void
}

/**
 * Default login method: passwordless sign-in with a one-time email code. The
 * shopper enters their email, receives a 6-digit code, and is signed in on
 * verification. Existing accounts only — unknown emails are told to register.
 */
export default function MonsoonOtpLogin({
  registerHref,
  onUsePassword,
}: Props) {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode?: string }
  const searchParams = useSearchParams()
  const returnTo = searchParams?.get("returnTo")

  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [stage, setStage] = useState<"email" | "code">("email")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const fallback = countryCode ? `/${countryCode}/account` : "/account"

  const handleSend = () => {
    setError(null)
    setInfo(null)
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email.")
      return
    }
    startTransition(async () => {
      const result = await sendLoginOtp(email.trim())
      if (!result.ok) {
        setError(result.error ?? "Could not send the code.")
        return
      }
      setStage("code")
      setInfo(
        `Demo mode: no email is sent to ${result.emailMasked ?? email.trim()}. Use code 123456.`
      )
    })
  }

  const handleVerify = () => {
    setError(null)
    if (!/^\d{6}$/.test(code.trim())) {
      setError("Enter the 6-digit code from your email.")
      return
    }
    startTransition(async () => {
      const result = await verifyLoginOtp(email.trim(), code.trim())
      if (!result.ok) {
        setError(result.error ?? "Could not sign you in.")
        return
      }
      router.push(returnTo || fallback)
      router.refresh()
    })
  }

  return (
    <section
      className="w-full max-w-lg mx-auto border-2 border-ink bg-surface p-8 sm:p-12 shadow-[8px_8px_0px_0px_var(--mc-ink)]"
      data-testid="otp-login-page"
    >
      <p className="font-family-heading text-xs font-bold uppercase tracking-[0.18em] text-accent">
        Member Access
      </p>
      <h1 className="mt-3 font-family-heading text-4xl sm:text-5xl font-black uppercase leading-[0.9] text-ink">
        Sign In <br /> With a Code
      </h1>
      <p className="mt-6 font-family-base text-base text-ink/70">
        {stage === "email"
          ? "Enter your email and we'll send a one-time code — no password needed."
          : "Enter the 6-digit code we just emailed you."}
      </p>

      <div className="mt-8 flex flex-col gap-5">
        <label className="grid gap-2">
          <span className="font-family-heading text-xs font-bold uppercase tracking-widest text-ink/70">
            Email
          </span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={stage === "code"}
            data-testid="otp-email-input"
            className="h-12 border-2 border-ink bg-surface px-4 font-family-base text-ink focus:outline-none disabled:opacity-60"
          />
        </label>

        {stage === "code" && (
          <label className="grid gap-2">
            <span className="font-family-heading text-xs font-bold uppercase tracking-widest text-ink/70">
              Verification code
            </span>
            <input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="••••••"
              data-testid="otp-code-input"
              className="h-12 w-full max-w-[12rem] border-2 border-ink bg-surface px-4 font-mono text-lg tracking-[0.4em] text-ink focus:outline-none"
            />
          </label>
        )}

        {info && !error && (
          <p className="font-family-base text-sm text-ink/65">{info}</p>
        )}
        {error && (
          <p
            className="text-xs uppercase text-red-700 font-family-heading"
            data-testid="otp-login-error-message"
          >
            {error}
          </p>
        )}

        {stage === "email" ? (
          <CTAButton
            type="button"
            onClick={handleSend}
            disabled={pending}
            className="w-full py-3 mt-2"
            data-testid="otp-send-button"
          >
            {pending ? "Sending…" : "Send login code"}
          </CTAButton>
        ) : (
          <div className="flex flex-col gap-3">
            <CTAButton
              type="button"
              onClick={handleVerify}
              disabled={pending}
              className="w-full py-3"
              data-testid="otp-verify-button"
            >
              {pending ? "Signing in…" : "Sign In"}
            </CTAButton>
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleSend}
                disabled={pending}
                className="font-family-heading text-[11px] font-bold uppercase tracking-[0.16em] text-ink/55 underline underline-offset-4 hover:text-ink disabled:opacity-50"
              >
                Resend code
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage("email")
                  setCode("")
                  setError(null)
                  setInfo(null)
                }}
                className="font-family-heading text-[11px] font-bold uppercase tracking-[0.16em] text-ink/55 underline underline-offset-4 hover:text-ink"
              >
                Use a different email
              </button>
            </div>
          </div>
        )}
      </div>

      {onUsePassword && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onUsePassword}
            className="font-family-heading text-xs font-bold uppercase tracking-[0.14em] text-ink/60 underline underline-offset-4 hover:text-ink"
            data-testid="use-password-button"
          >
            Sign in with a password instead
          </button>
        </div>
      )}

      <div className="mt-8 border-t border-ink/20 pt-6 flex items-center justify-between gap-4">
        <span className="font-family-base text-sm text-ink/65">
          Not a member yet?
        </span>
        {registerHref && (
          <LocalizedClientLink href={registerHref}>
            <OutlineButton
              type="button"
              className="px-5 py-2 font-family-heading text-xs font-bold uppercase tracking-[0.12em] text-ink"
              data-testid="register-button"
            >
              Join The Stash
            </OutlineButton>
          </LocalizedClientLink>
        )}
      </div>
    </section>
  )
}

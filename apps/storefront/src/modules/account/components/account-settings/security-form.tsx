"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import {
  sendPasswordOtp,
  setAccountPassword,
} from "@lib/data/account-settings"
import { CTAButton } from "@modules/common/components/monsoon/buttons"
import { Field, Notice } from "./fields"

// Set or change the account password, gated by an email verification code.
export default function SecurityForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [code, setCode] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, start] = useTransition()

  // Step 1: validate the new password, then email a verification code.
  const sendCode = () => {
    setMsg(null)
    if (password.length < 8) {
      setMsg({ ok: false, text: "Use at least 8 characters." })
      return
    }
    if (password !== confirm) {
      setMsg({ ok: false, text: "Passwords don't match." })
      return
    }
    start(async () => {
      const r = await sendPasswordOtp()
      if (!r.ok) {
        setMsg({ ok: false, text: r.error ?? "Could not send the code." })
        return
      }
      setCodeSent(true)
      setMsg({
        ok: true,
        text: `Demo mode: no email is sent to ${r.emailMasked ?? "you"}. Use code 123456.`,
      })
    })
  }

  // Step 2: submit the code with the new password.
  const savePassword = () => {
    setMsg(null)
    if (!/^\d{6}$/.test(code.trim())) {
      setMsg({ ok: false, text: "Enter the 6-digit code from your email." })
      return
    }
    start(async () => {
      const r = await setAccountPassword(password, code.trim())
      if (!r.ok) {
        setMsg({ ok: false, text: r.error ?? "Could not set password." })
        return
      }
      setPassword("")
      setConfirm("")
      setCode("")
      setCodeSent(false)
      setMsg({
        ok: true,
        text: hasPassword ? "Password updated." : "Password set.",
      })
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="font-family-base text-sm text-ink/65">
        {hasPassword
          ? "Update the password you use to sign in. We'll email you a code to confirm it's you."
          : "Add a password so you can also sign in without a one-time code. We'll email you a code to confirm it's you."}
      </p>
      <Field
        label={hasPassword ? "New password" : "Password"}
        value={password}
        onChange={setPassword}
        type="password"
        autoComplete="new-password"
      />
      <Field
        label="Confirm password"
        value={confirm}
        onChange={setConfirm}
        type="password"
        autoComplete="new-password"
      />

      {codeSent && (
        <Field
          label="Verification code"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
        />
      )}

      {msg && <Notice ok={msg.ok} message={msg.text} />}

      {!codeSent ? (
        <CTAButton
          type="button"
          onClick={sendCode}
          disabled={saving}
          className="w-full py-3 sm:w-auto sm:self-start sm:px-8"
        >
          {saving ? "Sending…" : "Send verification code"}
        </CTAButton>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <CTAButton
            type="button"
            onClick={savePassword}
            disabled={saving}
            className="py-3 px-8"
          >
            {saving
              ? "Saving…"
              : hasPassword
              ? "Update password"
              : "Set password"}
          </CTAButton>
          <button
            type="button"
            onClick={sendCode}
            disabled={saving}
            className="font-family-heading text-[11px] font-bold uppercase tracking-[0.16em] text-ink/55 underline underline-offset-4 hover:text-ink disabled:opacity-50"
          >
            Resend code
          </button>
        </div>
      )}
    </div>
  )
}

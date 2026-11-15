"use client"

import { useActionState } from "react"

import { adminSignIn } from "@lib/admin/actions"
import { Button, inputClass, labelClass } from "./ui"

export default function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminSignIn, null)

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <div>
        <label htmlFor="admin-email" className={labelClass}>
          Email
        </label>
        <input id="admin-email" name="email" type="email" autoComplete="username" required className={inputClass} />
      </div>
      <div>
        <label htmlFor="admin-password" className={labelClass}>
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>
      {state?.error && (
        <p role="alert" className="border-2 border-red-700 bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-xs text-ink/60">
        Demo admin: <span className="font-mono">admin@monsoon.test</span> /{" "}
        <span className="font-mono">admin12345</span>
      </p>
    </form>
  )
}

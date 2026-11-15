import { Metadata } from "next"
import { redirect } from "next/navigation"

import { adminBackendUrl, getAdminToken } from "@lib/admin/api"
import AdminLoginForm from "@modules/admin/login-form"

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function AdminLoginPage() {
  // Already signed in? Go straight to the dashboard.
  const token = await getAdminToken()
  if (token) {
    const res = await fetch(`${adminBackendUrl}/api/admin/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }).catch(() => null)
    if (res?.ok) redirect("/admin")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-4 py-10">
      <div className="w-full max-w-sm border-2 border-surface bg-surface p-6 shadow-[6px_6px_0px_0px_var(--mc-primary)] sm:p-8">
        <p className="font-family-heading text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Monsoon Coffee Co.
        </p>
        <h1 className="mt-1 font-family-heading text-3xl font-black uppercase text-ink">Admin</h1>
        <p className="mt-2 text-sm text-ink/70">Sign in to manage orders, products and messages.</p>
        <AdminLoginForm />
      </div>
    </div>
  )
}

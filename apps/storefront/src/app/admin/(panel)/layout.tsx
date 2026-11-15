import { Metadata } from "next"

import { adminSignOut } from "@lib/admin/actions"
import { adminApi } from "@lib/admin/api"
import AdminNav from "@modules/admin/nav"

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

// Every admin page sits inside this layout. Fetching /me here means a missing
// or expired admin session redirects to /admin/login before any page renders.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [{ admin }, stats] = await Promise.all([
    adminApi<{ admin: { name: string; email: string } }>("/me"),
    adminApi<{ new_messages: number }>("/stats"),
  ])

  return (
    <div className="min-h-screen bg-surface lg:flex">
      <aside className="bg-ink px-4 py-4 text-surface lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:shrink-0 lg:flex-col lg:px-5 lg:py-6">
        <div className="mb-4 flex items-center justify-between gap-3 lg:mb-8 lg:block">
          <div>
            <p className="font-family-heading text-lg font-black uppercase leading-tight">
              Monsoon <span className="text-[var(--mc-primary)]">Admin</span>
            </p>
            <p className="text-xs text-surface/60">{admin.email}</p>
          </div>
          <a
            href="/in"
            className="font-family-heading text-[11px] font-bold uppercase tracking-[0.14em] text-surface/70 underline-offset-4 hover:underline lg:mt-3 lg:inline-block"
          >
            View store ↗
          </a>
        </div>
        <AdminNav newMessages={stats.new_messages} />
        <form action={adminSignOut} className="mt-4 lg:mt-auto">
          <button
            type="submit"
            className="min-h-[40px] w-full border-2 border-surface/40 px-3 py-2 font-family-heading text-xs font-bold uppercase tracking-[0.14em] text-surface hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mc-primary)]"
          >
            Sign out
          </button>
        </form>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </div>
  )
}

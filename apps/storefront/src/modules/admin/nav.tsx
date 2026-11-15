"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/reviews", label: "Reviews" },
]

export default function AdminNav({ newMessages }: { newMessages: number }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/")

  return (
    <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-1">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`flex min-h-[40px] items-center justify-between gap-3 whitespace-nowrap border-2 px-3 py-2 font-family-heading text-xs font-bold uppercase tracking-[0.14em] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--mc-primary)] ${
                isActive(l.href)
                  ? "border-surface bg-surface text-ink"
                  : "border-transparent text-surface/80 hover:border-surface/40 hover:text-surface"
              }`}
            >
              {l.label}
              {l.href === "/admin/messages" && newMessages > 0 && (
                <span className="bg-[var(--mc-primary)] px-1.5 text-[10px] text-ink" aria-label={`${newMessages} new`}>
                  {newMessages}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

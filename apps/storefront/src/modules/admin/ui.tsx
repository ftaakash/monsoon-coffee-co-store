import { convertToLocale } from "@lib/util/money"

// Small building blocks shared by the admin pages, in the storefront's style:
// ink borders, hard offset shadows, uppercase display type.

export const inr = (amount?: number | null) =>
  convertToLocale({ amount: amount ?? 0, currency_code: "inr" })

export const shortDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—"

export function PageHeader({
  kicker,
  title,
  children,
}: {
  kicker?: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker && (
          <p className="font-family-heading text-xs font-bold uppercase tracking-[0.2em] text-accent">
            {kicker}
          </p>
        )}
        <h1 className="mt-1 break-words font-family-heading text-3xl font-black uppercase text-ink sm:text-4xl">
          {title}
        </h1>
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  )
}

export function Card({
  title,
  className = "",
  children,
}: {
  title?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      className={`min-w-0 border-2 border-ink bg-white p-4 shadow-[4px_4px_0px_0px_var(--mc-ink)] sm:p-5 ${className}`}
    >
      {title && (
        <h2 className="mb-4 font-family-heading text-sm font-bold uppercase tracking-[0.16em] text-ink">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

/** Shows the ?ok= / ?error= message left by a form action. */
export function Notice({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null
  return (
    <p
      role={error ? "alert" : "status"}
      className={`mb-6 border-2 px-4 py-3 font-family-heading text-sm font-bold ${
        error ? "border-red-700 bg-red-50 text-red-800" : "border-green-800 bg-green-50 text-green-900"
      }`}
    >
      {error ?? ok}
    </p>
  )
}

const STATUS_STYLES: Record<string, string> = {
  not_fulfilled: "bg-amber-100 text-amber-900 border-amber-800",
  partially_fulfilled: "bg-amber-100 text-amber-900 border-amber-800",
  fulfilled: "bg-green-100 text-green-900 border-green-800",
  shipped: "bg-sky-100 text-sky-900 border-sky-800",
  out_for_delivery: "bg-sky-100 text-sky-900 border-sky-800",
  delivered: "bg-green-100 text-green-900 border-green-800",
  canceled: "bg-red-100 text-red-900 border-red-800",
  published: "bg-green-100 text-green-900 border-green-800",
  draft: "bg-gray-100 text-gray-800 border-gray-700",
  rejected: "bg-red-100 text-red-900 border-red-800",
  pending: "bg-amber-100 text-amber-900 border-amber-800",
  new: "bg-amber-100 text-amber-900 border-amber-800",
  read: "bg-gray-100 text-gray-800 border-gray-700",
}

const STATUS_LABELS: Record<string, string> = {
  not_fulfilled: "To ship",
  partially_fulfilled: "To ship",
  fulfilled: "Tickets sent",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap border px-2 py-0.5 font-family-heading text-[11px] font-bold uppercase tracking-[0.08em] ${
        STATUS_STYLES[status] ?? "border-ink bg-white text-ink"
      }`}
    >
      {STATUS_LABELS[status] ?? status.replace(/_/g, " ")}
    </span>
  )
}

export const orderStatus = (o: { canceled_at?: string | null; fulfillment_status: string }) =>
  o.canceled_at ? "canceled" : o.fulfillment_status

// Tables scroll sideways inside their card on narrow screens instead of
// widening the page.
export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:-mx-5">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">{children}</table>
    </div>
  )
}

export const th =
  "border-b-2 border-ink px-4 py-2 font-family-heading text-[11px] font-bold uppercase tracking-[0.12em] text-ink/70 sm:px-5"
export const td = "border-b border-ink/15 px-4 py-3 align-top sm:px-5"

export const inputClass =
  "w-full border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
export const labelClass =
  "mb-1 block font-family-heading text-[11px] font-bold uppercase tracking-[0.14em] text-ink/70"

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "danger" }) {
  const styles = {
    primary: "border-ink bg-ink text-surface hover:bg-accent",
    outline: "border-ink bg-white text-ink hover:bg-ink hover:text-surface",
    danger: "border-red-800 bg-white text-red-800 hover:bg-red-800 hover:text-white",
  }[variant]
  return (
    <button
      {...props}
      className={`min-h-[40px] border-2 px-4 py-2 font-family-heading text-xs font-bold uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 ${styles} ${className}`}
    />
  )
}

export function LinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-[40px] items-center border-2 border-ink bg-ink px-4 py-2 font-family-heading text-xs font-bold uppercase tracking-[0.14em] text-surface hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      {children}
    </a>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-ink/60">{children}</p>
}

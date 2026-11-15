import Link from "next/link"

import { adminApi } from "@lib/admin/api"
import { Card, Empty, inr, orderStatus, PageHeader, shortDate, StatusBadge, Table, td, th } from "@modules/admin/ui"

type Stats = {
  revenue: number
  orders: number
  to_ship: number
  customers: number
  new_messages: number
  low_stock: { id: string; title: string; stock: number; product_id: string; product_title: string }[]
  top_products: { title: string; units: number; revenue: number }[]
}

type OrderSummary = {
  id: string
  display_id: number
  email: string
  total: number
  created_at: string
  canceled_at: string | null
  fulfillment_status: string
}

export default async function AdminDashboard() {
  const [stats, { orders }] = await Promise.all([
    adminApi<Stats>("/stats"),
    adminApi<{ orders: OrderSummary[] }>("/orders", { query: { limit: "5" } }),
  ])

  const tiles = [
    { label: "Revenue", value: inr(stats.revenue), href: "/admin/orders" },
    { label: "Orders", value: stats.orders, href: "/admin/orders" },
    { label: "To ship", value: stats.to_ship, href: "/admin/orders?status=not_fulfilled" },
    { label: "Customers", value: stats.customers, href: "/admin/customers" },
    { label: "New messages", value: stats.new_messages, href: "/admin/messages" },
  ]

  return (
    <>
      <PageHeader kicker="Overview" title="Dashboard" />

      <ul className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className="block h-full border-2 border-ink bg-white p-4 shadow-[4px_4px_0px_0px_var(--mc-ink)] hover:bg-ink hover:text-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <p className="font-family-heading text-[11px] font-bold uppercase tracking-[0.16em] opacity-70">{t.label}</p>
              <p className="mt-2 break-words font-family-heading text-2xl font-black tabular-nums sm:text-3xl">{t.value}</p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card title="Latest orders">
          {orders.length ? (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Order</th>
                  <th className={th}>Customer</th>
                  <th className={th}>Placed</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td className={td}>
                      <Link href={`/admin/orders/${o.id}`} className="font-bold underline underline-offset-4">
                        #{o.display_id}
                      </Link>
                    </td>
                    <td className={td}>{o.email}</td>
                    <td className={td}>{shortDate(o.created_at)}</td>
                    <td className={td}>
                      <StatusBadge status={orderStatus(o)} />
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Empty>No orders yet.</Empty>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card title="Low stock (5 or fewer)">
            {stats.low_stock.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {stats.low_stock.map((v) => (
                  <li key={v.id} className="flex items-baseline justify-between gap-3">
                    <Link href={`/admin/products/${v.product_id}`} className="min-w-0 underline-offset-4 hover:underline">
                      {v.product_title} <span className="text-ink/60">· {v.title}</span>
                    </Link>
                    <span className={`shrink-0 font-bold tabular-nums ${v.stock === 0 ? "text-red-700" : "text-amber-800"}`}>
                      {v.stock === 0 ? "Sold out" : `${v.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Everything is well stocked.</Empty>
            )}
          </Card>

          <Card title="Top products by revenue">
            {stats.top_products.length ? (
              <ol className="flex flex-col gap-2 text-sm">
                {stats.top_products.map((p) => (
                  <li key={p.title} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      {p.title} <span className="text-ink/60">× {p.units}</span>
                    </span>
                    <span className="shrink-0 tabular-nums">{inr(p.revenue)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>No sales yet.</Empty>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

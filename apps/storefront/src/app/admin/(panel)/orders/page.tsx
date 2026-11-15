import Link from "next/link"

import { adminApi } from "@lib/admin/api"
import {
  Button,
  Card,
  Empty,
  inputClass,
  inr,
  orderStatus,
  PageHeader,
  shortDate,
  StatusBadge,
  Table,
  td,
  th,
} from "@modules/admin/ui"

type OrderSummary = {
  id: string
  display_id: number
  email: string
  total: number
  items: { quantity: number }[]
  created_at: string
  canceled_at: string | null
  fulfillment_status: string
}

const FILTERS = [
  { value: "", label: "All" },
  { value: "not_fulfilled", label: "To ship" },
  { value: "shipped", label: "Shipped" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "canceled", label: "Canceled" },
]

export default async function AdminOrders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>
}) {
  const { status = "", q = "" } = await searchParams
  const { orders, count } = await adminApi<{ orders: OrderSummary[]; count: number }>("/orders", {
    query: { status, q, limit: "100" },
  })

  return (
    <>
      <PageHeader kicker={`${count} order${count === 1 ? "" : "s"}`} title="Orders" />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Filter by status" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex gap-2">
            {FILTERS.map((f) => {
              const active = f.value === status
              const href = `/admin/orders${f.value ? `?status=${f.value}` : ""}`
              return (
                <li key={f.value}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-[36px] items-center whitespace-nowrap border-2 border-ink px-3 font-family-heading text-[11px] font-bold uppercase tracking-[0.12em] ${
                      active ? "bg-ink text-surface" : "bg-white text-ink hover:bg-ink/10"
                    }`}
                  >
                    {f.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <form className="flex gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            name="q"
            defaultValue={q}
            placeholder="Email or #1001"
            className={`${inputClass} min-w-0 lg:w-56`}
          />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      <Card>
        {orders.length ? (
          <Table>
            <thead>
              <tr>
                <th className={th}>Order</th>
                <th className={th}>Customer</th>
                <th className={th}>Placed</th>
                <th className={th}>Items</th>
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
                  <td className={`${td} tabular-nums`}>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className={td}>
                    <StatusBadge status={orderStatus(o)} />
                  </td>
                  <td className={`${td} text-right tabular-nums`}>{inr(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <Empty>No orders match.</Empty>
        )}
      </Card>
    </>
  )
}

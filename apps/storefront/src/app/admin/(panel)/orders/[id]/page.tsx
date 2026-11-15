import Link from "next/link"

import { updateOrderStatus } from "@lib/admin/actions"
import { adminApi } from "@lib/admin/api"
import { Button, Card, inr, Notice, orderStatus, PageHeader, shortDate, StatusBadge, Table, td, th } from "@modules/admin/ui"

type Address = {
  first_name?: string
  last_name?: string
  address_1?: string
  address_2?: string
  city?: string
  province?: string
  postal_code?: string
  phone?: string
} | null

type Order = {
  id: string
  display_id: number
  email: string
  created_at: string
  canceled_at: string | null
  fulfillment_status: string
  payment_status: string
  subtotal: number
  discount_total: number
  shipping_total: number
  total: number
  shipping_address: Address
  shipping_methods: { name: string }[]
  promotions: { code: string }[]
  metadata: { refund_requested_at?: string; refund_note?: string | null }
  items: { id: string; product_title: string; variant_title: string | null; quantity: number; unit_price: number; total: number; requires_shipping: boolean }[]
  fulfillments: {
    id: string
    shipped_at?: string | null
    delivered_at?: string | null
    labels?: { tracking_number?: string }[]
    data?: { shipmozo?: { current_status?: string; courier?: string } }
    metadata?: { type?: string; tickets?: { code: string; title: string }[] }
  }[]
}

// The next step a physical order can move to, in order.
const NEXT: Record<string, { action: string; label: string } | undefined> = {
  not_fulfilled: { action: "shipped", label: "Mark as shipped" },
  partially_fulfilled: { action: "shipped", label: "Mark as shipped" },
  shipped: { action: "out_for_delivery", label: "Mark out for delivery" },
  out_for_delivery: { action: "delivered", label: "Mark as delivered" },
}

export default async function AdminOrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { id } = await params
  const notice = await searchParams
  const { order } = await adminApi<{ order: Order }>(`/orders/${id}`)
  const status = orderStatus(order)
  const next = order.canceled_at ? undefined : NEXT[order.fulfillment_status]
  const cancellable =
    !order.canceled_at && ["not_fulfilled", "partially_fulfilled", "fulfilled"].includes(order.fulfillment_status)
  const a = order.shipping_address
  const courier = order.fulfillments.find((f) => f.metadata?.type !== "digital")
  const tickets = order.fulfillments.flatMap((f) => f.metadata?.tickets ?? [])

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/orders" className="font-family-heading text-xs font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline">
          ← All orders
        </Link>
      </p>
      <PageHeader kicker={shortDate(order.created_at)} title={`Order #${order.display_id}`}>
        <StatusBadge status={status} />
      </PageHeader>
      <Notice {...notice} />

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Items">
            <Table>
              <thead>
                <tr>
                  <th className={th}>Product</th>
                  <th className={th}>Qty</th>
                  <th className={`${th} text-right`}>Price</th>
                  <th className={`${th} text-right`}>Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}>
                    <td className={td}>
                      {i.product_title}
                      <span className="block text-xs text-ink/60">
                        {i.variant_title}
                        {!i.requires_shipping && " · e-ticket"}
                      </span>
                    </td>
                    <td className={`${td} tabular-nums`}>{i.quantity}</td>
                    <td className={`${td} text-right tabular-nums`}>{inr(i.unit_price)}</td>
                    <td className={`${td} text-right tabular-nums`}>{inr(i.total)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm">
              <dt>Subtotal</dt>
              <dd className="text-right tabular-nums">{inr(order.subtotal)}</dd>
              {order.discount_total > 0 && (
                <>
                  <dt>Discount {order.promotions.map((p) => p.code).join(", ")}</dt>
                  <dd className="text-right tabular-nums">−{inr(order.discount_total)}</dd>
                </>
              )}
              <dt>Shipping {order.shipping_methods.map((m) => `(${m.name})`).join(" ")}</dt>
              <dd className="text-right tabular-nums">{inr(order.shipping_total)}</dd>
              <dt className="font-bold">Total</dt>
              <dd className="text-right font-bold tabular-nums">{inr(order.total)}</dd>
            </dl>
          </Card>

          <Card title="Fulfilment">
            {order.canceled_at ? (
              <p className="text-sm">Canceled on {shortDate(order.canceled_at)}. Stock was returned to inventory.</p>
            ) : order.fulfillment_status === "fulfilled" ? (
              <p className="text-sm">Ticket-only order: tickets were issued when the order was placed.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {courier && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                    <dt className="text-ink/60">Tracking no.</dt>
                    <dd className="font-mono">{courier.labels?.[0]?.tracking_number ?? "—"}</dd>
                    <dt className="text-ink/60">Courier status</dt>
                    <dd>{courier.data?.shipmozo?.current_status ?? "—"}</dd>
                    <dt className="text-ink/60">Shipped</dt>
                    <dd>{shortDate(courier.shipped_at)}</dd>
                    <dt className="text-ink/60">Delivered</dt>
                    <dd>{shortDate(courier.delivered_at)}</dd>
                  </dl>
                )}
                <div className="flex flex-wrap gap-3">
                  {next && (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="action" value={next.action} />
                      <Button type="submit">{next.label}</Button>
                    </form>
                  )}
                  {cancellable && (
                    <form action={updateOrderStatus}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="action" value="canceled" />
                      <Button type="submit" variant="danger">
                        Cancel order
                      </Button>
                    </form>
                  )}
                  {!next && !cancellable && <p className="text-sm">Delivered. Nothing left to do.</p>}
                </div>
                <p className="text-xs text-ink/60">
                  Each step updates the tracking timeline the customer sees on their order page.
                </p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card title="Customer">
            <p className="break-words text-sm">{order.email}</p>
            <p className="mt-1 text-xs text-ink/60">Payment: {order.payment_status} (demo)</p>
          </Card>
          {a?.address_1 && (
            <Card title="Ship to">
              <address className="text-sm not-italic leading-relaxed">
                {a.first_name} {a.last_name}
                <br />
                {a.address_1}
                {a.address_2 && (
                  <>
                    <br />
                    {a.address_2}
                  </>
                )}
                <br />
                {a.city}
                {a.province && `, ${a.province}`} {a.postal_code}
                {a.phone && (
                  <>
                    <br />
                    {a.phone}
                  </>
                )}
              </address>
            </Card>
          )}
          {tickets.length > 0 && (
            <Card title="Tickets">
              <ul className="flex flex-col gap-1 text-sm">
                {tickets.map((t) => (
                  <li key={t.code}>
                    <span className="font-mono">{t.code}</span> <span className="text-ink/60">· {t.title}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {order.metadata.refund_requested_at && (
            <Card title="Refund requested">
              <p className="text-sm">{shortDate(order.metadata.refund_requested_at)}</p>
              {order.metadata.refund_note && <p className="mt-2 text-sm italic">“{order.metadata.refund_note}”</p>}
            </Card>
          )}
        </div>
      </div>
    </>
  )
}

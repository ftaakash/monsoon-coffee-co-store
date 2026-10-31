import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type OrderSummaryProps = {
  order: HttpTypes.StoreOrder
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const fmt = (amount?: number | null) =>
    amount != null
      ? convertToLocale({ amount, currency_code: order.currency_code })
      : undefined

  const Row = ({
    label,
    value,
    accent = false,
  }: {
    label: string
    value?: string
    accent?: boolean
  }) => (
    <div className="flex items-baseline justify-between gap-3 font-family-base text-[13px] text-ink/70">
      <span className="flex items-baseline gap-2">
        <span className="uppercase tracking-[0.06em] text-ink/60">{label}</span>
        <span
          aria-hidden
          className="flex-1 translate-y-[-2px] border-b border-dotted border-ink/25"
        />
      </span>
      <span
        className={`font-mono tabular-nums ${
          accent ? "text-accent" : "text-ink"
        }`}
      >
        {value}
      </span>
    </div>
  )

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-family-heading text-xs font-bold uppercase tracking-[0.2em] text-accent">
          Receipt
        </h3>
        <span className="font-mono text-[11px] tabular-nums text-ink/45">
          #{order.display_id}
        </span>
      </div>
      <p className="mt-1 font-family-heading text-xl font-black uppercase text-ink sm:text-2xl">
        Order Summary
      </p>

      <div className="mt-5 flex flex-col gap-2.5">
        <Row label="Subtotal" value={fmt(order.subtotal)} />
        {order.discount_total > 0 && (
          <Row
            label="Discount"
            value={`- ${fmt(order.discount_total)}`}
            accent
          />
        )}
        {order.gift_card_total > 0 && (
          <Row
            label="Gift card"
            value={`- ${fmt(order.gift_card_total)}`}
            accent
          />
        )}
        <Row label="Taxes" value={fmt(order.tax_total)} />
      </div>

      {/* Perforated divider */}
      <div className="relative my-5 h-[2px] bg-ink">
        <span className="absolute left-[-1rem] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface" />
        <span className="absolute right-[-1rem] top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-surface" />
      </div>

      <div className="flex items-end justify-between">
        <span className="font-family-heading text-[11px] font-bold uppercase tracking-[0.2em] text-ink/55">
          Total Paid
        </span>
        <span className="font-family-heading text-3xl font-black tabular-nums text-ink sm:text-4xl">
          {fmt(order.total)}
        </span>
      </div>
    </div>
  )
}

export default OrderSummary

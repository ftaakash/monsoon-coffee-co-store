import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OrderDetails from "@modules/order/components/order-details"
import OrderSummary from "@modules/order/components/order-summary"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  return (
    <main className="min-h-[calc(100vh-64px)] bg-surface px-6 pb-24 pt-14 sm:px-8 lg:px-10 xl:px-12">
      <div className="mx-auto w-full max-w-5xl">
        <section
          className="border-b-2 border-ink pb-8 sm:pb-10"
          data-testid="order-complete-container"
        >
          <p className="font-family-heading text-sm font-bold uppercase tracking-[0.12em] text-accent sm:text-base">
            Order Confirmed
          </p>
          <h1 className="mt-4 font-family-heading text-[clamp(3rem,7vw,7rem)] font-black uppercase leading-[0.9] text-ink">
            Thank You.
          </h1>
          <p className="mt-4 max-w-2xl font-family-base text-base text-ink/65 sm:text-lg">
            Your order was placed successfully. The roaster has the stash and
            we&apos;ll keep you posted on every step.
          </p>
          <a
            href={`/api/receipt/${order.id}`}
            className="mt-6 inline-flex items-center gap-2 border-2 border-ink bg-ink px-5 py-3 font-family-heading text-sm font-bold uppercase tracking-[0.12em] text-surface transition-colors hover:bg-accent hover:border-accent"
            data-testid="download-receipt-link"
          >
            ↓ Download receipt
          </a>
        </section>

        <div className="mt-10 flex flex-col gap-8">
          <section className="border-2 border-ink bg-surface p-6 sm:p-8 shadow-[4px_4px_0px_0px_var(--mc-ink)]">
            <OrderDetails order={order} />
          </section>

          <section className="border-2 border-ink bg-surface p-6 sm:p-8 shadow-[4px_4px_0px_0px_var(--mc-ink)]">
            <h2 className="mb-6 font-family-heading text-2xl sm:text-3xl font-black uppercase text-ink">
              Summary
            </h2>
            <Items order={order} />
            <div className="mt-6 border-t-2 border-ink/15 pt-6">
              <OrderSummary order={order} />
            </div>
          </section>

          <section className="border-2 border-ink bg-surface p-6 sm:p-8 shadow-[4px_4px_0px_0px_var(--mc-ink)]">
            <ShippingDetails order={order} />
          </section>

          <section className="border-2 border-ink bg-surface p-6 sm:p-8 shadow-[4px_4px_0px_0px_var(--mc-ink)]">
            <PaymentDetails order={order} />
          </section>

          <section className="border-2 border-ink bg-surface p-6 sm:p-8 shadow-[4px_4px_0px_0px_var(--mc-ink)]">
            <Help />
          </section>
        </div>
      </div>
    </main>
  )
}

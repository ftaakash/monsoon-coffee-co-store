"use client"

import { useParams, useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import { convertToLocale } from "@lib/util/money"
import { CheckIcon } from "@modules/common/icons/monsoon/check"
import {
  CTAButton,
  OutlineButton,
} from "@modules/common/components/monsoon/buttons"
import MonsoonPincodeCheck from "@modules/common/components/monsoon/pincode-check"

type Props = {
  cart: HttpTypes.StoreCart
}

export default function MonsoonCartSummary({ cart }: Props) {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode: string }
  const currency = cart.currency_code

  const subtotal = cart.subtotal ?? 0
  const total = cart.total ?? 0
  const discount = cart.discount_total ?? 0
  const promoCodes = (cart.promotions ?? [])
    .map((p) => p.code)
    .filter(Boolean)
    .join(", ")

  const initialPincode =
    cart.shipping_address?.postal_code?.toString().replace(/\D/g, "") ?? ""

  return (
    <aside className="h-fit w-full min-w-0 self-start border-2 border-ink bg-surface p-5 shadow-[4px_4px_0px_0px_var(--mc-ink)] sm:p-6 sm:shadow-[6px_6px_0px_0px_var(--mc-ink)] lg:sticky lg:top-8 lg:shadow-[8px_8px_0px_0px_var(--mc-ink)]">
      <h2 className="font-family-heading text-2xl font-bold uppercase text-ink sm:text-3xl lg:text-4xl">
        Summary
      </h2>

      <MonsoonPincodeCheck
        cartId={cart.id}
        currency={currency}
        className="mt-5"
        initialPincode={initialPincode || null}
      />

      <div className="mt-4 border-t border-b border-ink/60 py-5 font-family-heading text-sm uppercase sm:text-base lg:text-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink/85">Subtotal</span>
          <span className="font-black text-ink">
            {convertToLocale({ amount: subtotal, currency_code: currency })}
          </span>
        </div>
        {discount > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <span className="font-semibold text-ink/85">
              Discount
              {promoCodes ? (
                <span className="ml-2 text-xs text-accent">{promoCodes}</span>
              ) : null}
            </span>
            <span className="font-black text-ink">
              −{convertToLocale({ amount: discount, currency_code: currency })}
            </span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="font-family-heading text-xs font-semibold uppercase tracking-[0.16em] text-ink/70 sm:text-sm">
          Total Due
        </p>
        <p className="mt-1 font-family-heading text-3xl font-black tabular-nums text-ink sm:text-4xl lg:text-5xl">
          {convertToLocale({ amount: total, currency_code: currency })}
        </p>
      </div>

      <CTAButton
        type="button"
        onClick={() => router.push(`/${countryCode}/checkout`)}
        className="mt-6 w-full bg-[var(--mc-primary)] py-3 font-family-heading text-base font-bold uppercase tracking-[0.14em] transition-colors hover:bg-accent sm:mt-8 sm:py-4 sm:text-lg sm:tracking-[0.16em] lg:text-xl"
      >
        Proceed to Checkout
      </CTAButton>
      <OutlineButton
        type="button"
        onClick={() => router.push(`/${countryCode}/store`)}
        className="mt-3 w-full bg-surface py-2.5 font-family-heading text-xs font-bold uppercase tracking-[0.18em] text-ink sm:mt-4 sm:py-3 sm:text-sm sm:tracking-[0.2em]"
      >
        Back to Shop
      </OutlineButton>

      <div className="mt-8 border-t border-ink/20 pt-6 text-ink/65">
        <p className="flex items-start gap-2 font-family-heading text-xs font-bold uppercase tracking-[0.14em]">
          <CheckIcon className="mt-0.5 h-4 w-4" />
          Secure transaction via industrial strength encryption.
        </p>
      </div>
    </aside>
  )
}

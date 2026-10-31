"use client"

import { useCallback, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"

import {
  checkCartInventory,
  placeRazorpayOrder,
} from "@modules/checkout/actions"

type Props = {
  cart: HttpTypes.StoreCart
  countryCode: string
  className?: string
  children?: React.ReactNode
  disabled?: boolean
}

// Stands in for the Razorpay checkout window in the frontend-only build: it
// re-checks stock, pretends to take payment, then completes the order.
export default function DemoPaymentButton({
  cart,
  countryCode,
  className,
  children,
  disabled,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const session = cart.payment_collection?.payment_sessions?.find(
    (s) => s.status === "pending"
  )

  const handleClick = useCallback(async () => {
    setError(null)
    if (!session) {
      setError("Payment session not ready. Please refresh and try again.")
      return
    }

    setLoading(true)

    const inventory = await checkCartInventory(cart.id)
    if (!inventory.ok) {
      setLoading(false)
      setError(inventory.error)
      return
    }

    // A short pause so the "processing" state is visible, like a real gateway.
    await new Promise((resolve) => setTimeout(resolve, 600))

    startTransition(async () => {
      try {
        const result = await placeRazorpayOrder({
          cartId: cart.id,
          countryCode,
        })
        if (result.success) {
          router.push(result.redirectTo)
          return
        }
        setLoading(false)
        setError(result.error)
      } catch (e) {
        setLoading(false)
        setError(e instanceof Error ? e.message : "Could not place order")
      }
    })
  }, [cart.id, countryCode, session, router])

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || loading || !session}
        className={className}
      >
        {loading ? "Processing…" : children ?? "Pay now"}
      </button>
      {error && (
        <p className="font-family-base text-sm text-red-700">{error}</p>
      )}
    </div>
  )
}

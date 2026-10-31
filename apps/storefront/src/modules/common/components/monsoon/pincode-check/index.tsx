"use client"

import { useEffect, useState } from "react"
import { checkPincode } from "@lib/data/shipping"

export type PincodeEstimate = {
  serviceable: boolean
  pincode?: string | null
  amount?: number
  currency?: string
  courier_name?: string | null
  expected_delivery_days?: number | string | null
  error?: string
}

type Props = {
  cartId?: string
  currency?: string
  paymentType?: "PREPAID" | "COD"
  className?: string
  /**
   * Pincode to seed the input with (e.g. cart.shipping_address.postal_code).
   * When provided, the component auto-runs a check on mount so the user
   * sees serviceability of their saved address immediately.
   */
  initialPincode?: string | null
  /**
   * Label shown when the input is locked to the prefilled address.
   * Defaults to "Using your shipping address".
   */
  prefillLabel?: string
  /**
   * Fired whenever a fresh result is available. Useful for parent
   * components that want to mirror the price elsewhere (cart bag, etc).
   */
  onEstimate?: (estimate: PincodeEstimate | null) => void
}

const PINCODE_RE = /^\d{6}$/

export default function MonsoonPincodeCheck({
  cartId,
  currency = "INR",
  paymentType = "PREPAID",
  className = "",
  initialPincode,
  prefillLabel = "Using your shipping address",
  onEstimate,
}: Props) {
  const seed = (initialPincode ?? "").replace(/\D/g, "").slice(0, 6)
  const [pincode, setPincode] = useState(seed)
  const [locked, setLocked] = useState<boolean>(!!seed && PINCODE_RE.test(seed))
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PincodeEstimate | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runCheck(target: string) {
    setError(null)
    setResult(null)
    if (!PINCODE_RE.test(target)) {
      setError("Enter a valid 6-digit pincode")
      onEstimate?.(null)
      return
    }
    setLoading(true)
    try {
      const r = await checkPincode(target, cartId)
      setResult(r)
      onEstimate?.(r)
    } catch (err) {
      const msg = (err as Error).message || "Could not check delivery"
      setError(msg)
      onEstimate?.(null)
    } finally {
      setLoading(false)
    }
  }

  // Auto-check on mount when seeded from a saved address.
  useEffect(() => {
    if (seed && PINCODE_RE.test(seed)) {
      runCheck(seed)
    }
    // We deliberately depend on `seed`, not `pincode`, so a parent passing
    // a new initial value (e.g. after the cart address changes) re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, cartId])

  const editing = !locked

  return (
    <div className={className}>
      <p className="font-family-heading text-xs font-bold uppercase tracking-[0.16em] text-ink/70 sm:text-sm">
        Delivery to pincode
      </p>

      {locked && seed && (
        <p className="mt-1 font-family-base text-xs text-ink/55">
          {prefillLabel} · <span className="font-mono tabular-nums">{seed}</span>
        </p>
      )}

      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={pincode}
            onChange={(e) =>
              setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="6-digit pincode"
            className="flex-1 border-2 border-ink bg-surface px-3 py-2 font-family-heading text-base font-semibold uppercase tracking-wider text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-accent"
            onKeyDown={(e) => {
              if (e.key === "Enter") runCheck(pincode)
            }}
          />
          <button
            type="button"
            onClick={() => runCheck(pincode)}
            disabled={loading || !pincode}
            className="border-2 border-ink bg-ink px-4 py-2 font-family-heading text-sm font-black uppercase tracking-[0.18em] text-surface transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "…" : "Check"}
          </button>
        </div>
      )}

      {loading && locked && (
        <p className="mt-2 font-family-base text-xs uppercase tracking-widest text-ink/55">
          Verifying delivery…
        </p>
      )}

      {error && (
        <p className="mt-2 font-family-heading text-xs font-bold uppercase tracking-[0.14em] text-red-600">
          {error}
        </p>
      )}

      {result && !error && (
        <div
          className={`mt-3 border-2 px-3 py-2 font-family-heading text-sm ${
            result.serviceable
              ? "border-ink bg-[var(--mc-primary)]/15"
              : "border-red-700 bg-red-50"
          }`}
        >
          {!result.serviceable ? (
            <p className="font-bold uppercase tracking-[0.14em] text-red-700">
              {result.error || "Not serviceable for this pincode."}
            </p>
          ) : (
            <>
              <p className="font-bold uppercase tracking-[0.14em] text-ink">
                Delivers to {result.pincode || pincode} ✓
              </p>
              {result.expected_delivery_days && (
                <p className="mt-1 text-ink/70">
                  Expected in {String(result.expected_delivery_days)}{" "}
                  {String(result.expected_delivery_days) === "1"
                    ? "day"
                    : "days"}
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

import { setReviewStatusAction } from "@lib/admin/actions"
import { adminApi } from "@lib/admin/api"
import { Button, Card, Empty, Notice, PageHeader, shortDate, StatusBadge } from "@modules/admin/ui"

type Review = {
  id: string
  product_title: string
  customer_name: string | null
  variant_title: string | null
  rating: number
  title: string | null
  body: string
  images: string[]
  status: "pending" | "published" | "rejected"
  created_at: string
}

export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const [{ reviews }, notice] = await Promise.all([adminApi<{ reviews: Review[] }>("/reviews"), searchParams])

  return (
    <>
      <PageHeader kicker={`${reviews.length} review${reviews.length === 1 ? "" : "s"}`} title="Reviews" />
      <Notice {...notice} />
      {reviews.length ? (
        <ul className="grid gap-4 xl:grid-cols-2">
          {reviews.map((r) => (
            <li key={r.id} className="min-w-0">
              <Card className="h-full">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-family-heading text-sm font-bold uppercase">{r.product_title}</p>
                    <p className="text-sm text-ink/70">
                      {r.customer_name ?? "Anonymous"}
                      {r.variant_title && ` · ${r.variant_title}`} · {shortDate(r.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-2 text-lg tracking-widest text-accent" aria-label={`${r.rating} out of 5 stars`}>
                  {"★".repeat(r.rating)}
                  <span className="text-ink/20">{"★".repeat(5 - r.rating)}</span>
                </p>
                {r.title && <p className="mt-1 font-bold">{r.title}</p>}
                <p className="mt-1 break-words text-sm">{r.body}</p>
                {r.images.length > 0 && <p className="mt-2 text-xs text-ink/60">{r.images.length} photo(s) attached</p>}
                <form action={setReviewStatusAction} className="mt-4">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="status" value={r.status === "rejected" ? "published" : "rejected"} />
                  <Button type="submit" variant={r.status === "rejected" ? "outline" : "danger"}>
                    {r.status === "rejected" ? "Publish again" : "Hide from store"}
                  </Button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <Empty>No reviews yet.</Empty>
        </Card>
      )}
    </>
  )
}

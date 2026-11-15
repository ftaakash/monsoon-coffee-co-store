import Image from "next/image"
import Link from "next/link"

import { adminApi } from "@lib/admin/api"
import { Button, Card, Empty, inputClass, inr, LinkButton, PageHeader, StatusBadge, Table, td, th } from "@modules/admin/ui"

type Product = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  status: string
  categories: { name: string }[]
  variants: {
    id: string
    title: string
    manage_inventory: boolean
    inventory_quantity: number | null
    calculated_price: { calculated_amount: number }
  }[]
}

const stockLabel = (p: Product) => {
  const tracked = p.variants.filter((v) => v.manage_inventory)
  if (!tracked.length) return { text: "Not tracked", tone: "text-ink/60" }
  const total = tracked.reduce((n, v) => n + (v.inventory_quantity ?? 0), 0)
  const soldOut = tracked.filter((v) => (v.inventory_quantity ?? 0) === 0).length
  return {
    text: `${total} in stock${soldOut ? ` · ${soldOut} sold out` : ""}`,
    tone: total === 0 ? "text-red-700" : soldOut ? "text-amber-800" : "text-ink",
  }
}

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams
  const { products, count } = await adminApi<{ products: Product[]; count: number }>("/products", { query: { q } })

  return (
    <>
      <PageHeader kicker={`${count} product${count === 1 ? "" : "s"}`} title="Products">
        <LinkButton href="/admin/products/new">+ New product</LinkButton>
      </PageHeader>

      <form className="mb-4 flex gap-2" role="search">
        <label htmlFor="product-search" className="sr-only">
          Search products
        </label>
        <input id="product-search" name="q" defaultValue={q} placeholder="Search products" className={`${inputClass} max-w-xs`} />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Card>
        {products.length ? (
          <Table>
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Category</th>
                <th className={th}>Price</th>
                <th className={th}>Stock</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const prices = p.variants.map((v) => v.calculated_price.calculated_amount)
                const min = Math.min(...prices)
                const max = Math.max(...prices)
                const stock = stockLabel(p)
                return (
                  <tr key={p.id}>
                    <td className={td}>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        {p.thumbnail ? (
                          <Image src={p.thumbnail} alt="" width={40} height={40} className="h-10 w-10 shrink-0 border border-ink object-cover" />
                        ) : (
                          <span className="h-10 w-10 shrink-0 border border-ink bg-ink/10" />
                        )}
                        <span className="font-bold underline-offset-4 hover:underline">{p.title}</span>
                      </Link>
                    </td>
                    <td className={td}>{p.categories.map((c) => c.name).join(", ") || "—"}</td>
                    <td className={`${td} whitespace-nowrap tabular-nums`}>
                      {min === max ? inr(min) : `${inr(min)} – ${inr(max)}`}
                    </td>
                    <td className={`${td} ${stock.tone}`}>{stock.text}</td>
                    <td className={td}>
                      <StatusBadge status={p.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        ) : (
          <Empty>No products match.</Empty>
        )}
      </Card>
    </>
  )
}

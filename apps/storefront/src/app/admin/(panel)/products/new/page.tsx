import Link from "next/link"

import { createProductAction } from "@lib/admin/actions"
import { adminApi } from "@lib/admin/api"
import ProductForm, { FormOptions } from "@modules/admin/product-form"
import { Notice, PageHeader } from "@modules/admin/ui"

export default async function NewProduct({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [options, notice] = await Promise.all([adminApi<FormOptions>("/options"), searchParams])

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/products" className="font-family-heading text-xs font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline">
          ← All products
        </Link>
      </p>
      <PageHeader kicker="Catalogue" title="New product" />
      <Notice {...notice} />
      <ProductForm action={createProductAction} options={options} />
    </>
  )
}

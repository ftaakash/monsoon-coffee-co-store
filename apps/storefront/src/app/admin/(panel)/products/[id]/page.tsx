import Link from "next/link"

import { addVariantAction, deleteVariantAction, updateProductAction, updateVariantAction } from "@lib/admin/actions"
import { adminApi } from "@lib/admin/api"
import ProductForm, { EditableProduct, FormOptions } from "@modules/admin/product-form"
import { Button, Card, inputClass, labelClass, Notice, PageHeader, StatusBadge } from "@modules/admin/ui"

type Variant = {
  id: string
  title: string
  sku: string | null
  manage_inventory: boolean
  inventory_quantity: number | null
  calculated_price: { calculated_amount: number; original_amount: number }
}

type Product = EditableProduct & { options: { title: string }[]; variants: Variant[] }

const small = `${inputClass} py-1.5`

export default async function EditProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ ok?: string; error?: string }>
}) {
  const { id } = await params
  const [{ product }, options, notice] = await Promise.all([
    adminApi<{ product: Product }>(`/products/${id}`),
    adminApi<FormOptions>("/options"),
    searchParams,
  ])
  const optionName = product.options[0]?.title ?? "Option"

  return (
    <>
      <p className="mb-2">
        <Link href="/admin/products" className="font-family-heading text-xs font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline">
          ← All products
        </Link>
      </p>
      <PageHeader kicker="Edit product" title={product.title}>
        <StatusBadge status={product.status} />
        {product.status === "published" && (
          <a href={`/in/products/${product.handle}`} className="font-family-heading text-xs font-bold uppercase tracking-[0.14em] underline underline-offset-4">
            View in store ↗
          </a>
        )}
      </PageHeader>
      <Notice {...notice} />

      <div className="flex flex-col gap-6">
        <Card title={`Variants (${optionName})`}>
          <ul className="flex flex-col gap-4">
            {product.variants.map((v) => (
              <li key={v.id} className="border-b border-ink/15 pb-4 last:border-0 last:pb-0">
                <form action={updateVariantAction} className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto_auto]">
                  <input type="hidden" name="product_id" value={product.id} />
                  <input type="hidden" name="variant_id" value={v.id} />
                  <div>
                    <label htmlFor={`t-${v.id}`} className={labelClass}>
                      {optionName}
                    </label>
                    <input id={`t-${v.id}`} name="variant_title" defaultValue={v.title} required className={small} />
                    <p className="mt-1 font-mono text-[10px] text-ink/50">{v.sku}</p>
                  </div>
                  <div>
                    <label htmlFor={`p-${v.id}`} className={labelClass}>
                      Price ₹
                    </label>
                    <input id={`p-${v.id}`} name="price" type="number" min={0} step={1} required defaultValue={v.calculated_price.calculated_amount} className={small} />
                  </div>
                  <div>
                    <label htmlFor={`o-${v.id}`} className={labelClass}>
                      Was ₹
                    </label>
                    <input
                      id={`o-${v.id}`}
                      name="original_price"
                      type="number"
                      min={0}
                      step={1}
                      defaultValue={
                        v.calculated_price.original_amount > v.calculated_price.calculated_amount
                          ? v.calculated_price.original_amount
                          : ""
                      }
                      className={small}
                    />
                  </div>
                  <div>
                    <label htmlFor={`s-${v.id}`} className={labelClass}>
                      Stock
                    </label>
                    <input id={`s-${v.id}`} name="stock" type="number" min={0} step={1} defaultValue={v.inventory_quantity ?? ""} className={small} />
                  </div>
                  <label className="flex min-h-[40px] items-center gap-2 text-sm">
                    <input type="checkbox" name="manage_inventory" defaultChecked={v.manage_inventory} className="accent-[var(--mc-accent)]" />
                    Track
                  </label>
                  <Button type="submit" variant="outline">
                    Save
                  </Button>
                </form>
                {product.variants.length > 1 && (
                  <form action={deleteVariantAction} className="mt-2">
                    <input type="hidden" name="product_id" value={product.id} />
                    <input type="hidden" name="variant_id" value={v.id} />
                    <button type="submit" className="text-xs font-bold uppercase tracking-[0.12em] text-red-800 underline-offset-4 hover:underline">
                      Delete {v.title}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>

          <form action={addVariantAction} className="mt-6 grid items-end gap-3 border-t-2 border-ink pt-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto_auto]">
            <input type="hidden" name="product_id" value={product.id} />
            <p className="font-family-heading text-xs font-bold uppercase tracking-[0.14em] sm:col-span-2 lg:col-span-5">Add a variant</p>
            <div>
              <label htmlFor="nv-title" className={labelClass}>
                {optionName}
              </label>
              <input id="nv-title" name="variant_title" required className={small} />
            </div>
            <div>
              <label htmlFor="nv-price" className={labelClass}>
                Price ₹
              </label>
              <input id="nv-price" name="price" type="number" min={0} step={1} required className={small} />
            </div>
            <div>
              <label htmlFor="nv-stock" className={labelClass}>
                Stock
              </label>
              <input id="nv-stock" name="stock" type="number" min={0} step={1} defaultValue={0} className={small} />
            </div>
            <label className="flex min-h-[40px] items-center gap-2 text-sm">
              <input type="checkbox" name="manage_inventory" defaultChecked className="accent-[var(--mc-accent)]" />
              Track
            </label>
            <Button type="submit">Add</Button>
          </form>
        </Card>

        <ProductForm action={updateProductAction} options={options} product={product} />
      </div>
    </>
  )
}

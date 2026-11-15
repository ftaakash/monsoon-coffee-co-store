import Image from "next/image"

import { Button, Card, inputClass, labelClass } from "./ui"

export type FormOptions = {
  categories: { id: string; name: string }[]
  collections: { id: string; title: string }[]
  tags: { id: string; value: string }[]
  images: string[]
}

export type EditableProduct = {
  id: string
  title: string
  handle: string
  subtitle: string | null
  description: string
  status: string
  collection_id: string | null
  shipping_profile: { id: string }
  categories: { id: string }[]
  tags: { id: string }[]
  images: { url: string }[]
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
    </div>
  )
}

function CheckboxGroup({
  legend,
  name,
  items,
  checked,
}: {
  legend: string
  name: string
  items: { id: string; label: string }[]
  checked: string[]
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <label key={i.id} className="flex min-h-[36px] cursor-pointer items-center gap-2 border-2 border-ink/30 bg-white px-3 text-sm has-[:checked]:border-ink has-[:checked]:bg-ink/5">
            <input type="checkbox" name={name} value={i.id} defaultChecked={checked.includes(i.id)} className="accent-[var(--mc-accent)]" />
            {i.label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/**
 * The product details form, used both to create and to edit. Create also asks
 * for the first variant (every product needs at least one price).
 */
export default function ProductForm({
  action,
  options,
  product,
}: {
  action: (formData: FormData) => Promise<void>
  options: FormOptions
  product?: EditableProduct
}) {
  const images = product?.images.map((i) => i.url) ?? []
  return (
    <form action={action} className="flex flex-col gap-6">
      {product && <input type="hidden" name="id" value={product.id} />}

      <Card title="Details">
        <div className="grid gap-4 md:grid-cols-2">
          <Field id="p-title" label="Title *">
            <input id="p-title" name="title" required defaultValue={product?.title} className={inputClass} />
          </Field>
          <Field id="p-handle" label="URL handle (blank = from title)">
            <input id="p-handle" name="handle" defaultValue={product?.handle} className={inputClass} placeholder="e.g. monsooned-malabar-aa" />
          </Field>
          <div className="md:col-span-2">
            <Field id="p-subtitle" label="Subtitle (comma-separated highlights)">
              <input id="p-subtitle" name="subtitle" defaultValue={product?.subtitle ?? ""} className={inputClass} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field id="p-description" label="Description">
              <textarea id="p-description" name="description" rows={4} defaultValue={product?.description} className={inputClass} />
            </Field>
          </div>
          <Field id="p-status" label="Status">
            <select id="p-status" name="status" defaultValue={product?.status ?? "draft"} className={inputClass}>
              <option value="published">Published (visible in store)</option>
              <option value="draft">Draft (hidden)</option>
            </select>
          </Field>
          <Field id="p-profile" label="Delivery">
            <select
              id="p-profile"
              name="shipping_profile"
              defaultValue={product?.shipping_profile.id === "sp_digital" ? "digital" : "physical"}
              className={inputClass}
            >
              <option value="physical">Shipped by courier</option>
              <option value="digital">Digital (event ticket)</option>
            </select>
          </Field>
          <Field id="p-collection" label="Collection">
            <select id="p-collection" name="collection_id" defaultValue={product?.collection_id ?? ""} className={inputClass}>
              <option value="">None</option>
              {options.collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card title="Organisation">
        <div className="flex flex-col gap-5">
          <CheckboxGroup
            legend="Categories"
            name="category_ids"
            items={options.categories.map((c) => ({ id: c.id, label: c.name }))}
            checked={product?.categories.map((c) => c.id) ?? []}
          />
          <CheckboxGroup
            legend="Store filter tags (origin, process, roast)"
            name="tag_ids"
            items={options.tags.map((t) => ({ id: t.id, label: t.value }))}
            checked={product?.tags.map((t) => t.id) ?? []}
          />
        </div>
      </Card>

      <Card title="Images">
        <fieldset>
          <legend className="mb-3 text-sm text-ink/70">The first ticked image is the thumbnail.</legend>
          <div className="flex flex-wrap gap-3">
            {options.images.map((src) => (
              <label key={src} className="cursor-pointer border-2 border-ink/20 p-1 has-[:checked]:border-ink has-[:checked]:shadow-[3px_3px_0px_0px_var(--mc-ink)]">
                <Image src={src} alt={src.split("/").pop() ?? ""} width={88} height={88} className="h-[88px] w-[88px] object-cover" />
                <span className="mt-1 flex items-center gap-1 text-xs">
                  <input type="checkbox" name="images" value={src} defaultChecked={images.includes(src)} className="accent-[var(--mc-accent)]" />
                  Use
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {!product && (
        <Card title="First variant">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field id="v-option" label="Option name">
              <input id="v-option" name="option_title" defaultValue="Size" className={inputClass} />
            </Field>
            <Field id="v-title" label="Value *">
              <input id="v-title" name="variant_title" required placeholder="e.g. 250g" className={inputClass} />
            </Field>
            <Field id="v-price" label="Price (₹) *">
              <input id="v-price" name="price" type="number" min={0} step={1} required className={inputClass} />
            </Field>
            <Field id="v-original" label="Was price (₹, optional)">
              <input id="v-original" name="original_price" type="number" min={0} step={1} className={inputClass} />
            </Field>
            <Field id="v-stock" label="Stock">
              <input id="v-stock" name="stock" type="number" min={0} step={1} defaultValue={0} className={inputClass} />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="manage_inventory" defaultChecked className="accent-[var(--mc-accent)]" />
              Track stock
            </label>
          </div>
        </Card>
      )}

      <div>
        <Button type="submit">{product ? "Save product" : "Create product"}</Button>
      </div>
    </form>
  )
}

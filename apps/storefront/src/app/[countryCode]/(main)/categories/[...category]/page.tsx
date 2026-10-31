import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { listRegions } from "@lib/data/regions"
import { HttpTypes, StoreRegion } from "@medusajs/types"
import CategoryTemplate from "@modules/categories/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import JsonLd from "@modules/common/components/json-ld"
import { SITE, absoluteUrl, breadcrumbJsonLd } from "@lib/util/seo"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
  }>
}

// See products/[handle]/page.tsx: the shared (main) layout reads per-request
// cookies, so this route must render dynamically rather than be prerendered as
// static, otherwise on-demand revalidation throws DYNAMIC_SERVER_USAGE.
export const dynamic = "force-dynamic"

export async function generateStaticParams() {
  try {
    const product_categories = await listCategories()

    if (!product_categories) {
      return []
    }

    const countryCodes = await listRegions().then((regions: StoreRegion[]) =>
      regions?.map((r) => r.countries?.map((c) => c.iso_2)).flat()
    )

    const categoryHandles = product_categories.map(
      (category: HttpTypes.StoreProductCategory) => category.handle
    )

    const staticParams = countryCodes
      ?.map((countryCode: string | undefined) =>
        categoryHandles.map((handle: string) => ({
          countryCode,
          category: [handle],
        }))
      )
      .flat()

    return staticParams
  } catch (error) {
    console.error(
      `Failed to generate static paths for category pages: ${
        error instanceof Error ? error.message : "Unknown error"
      }.`
    )
    return []
  }
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  try {
    const productCategory = await getCategoryByHandle(params.category)
    if (!productCategory) notFound()

    const description =
      productCategory.description ??
      `Shop ${productCategory.name} at ${SITE.name} — small-batch specialty coffee, freshly roasted.`

    return {
      title: productCategory.name,
      description,
      alternates: {
        canonical: `/${params.countryCode}/categories/${params.category.join("/")}`,
      },
      openGraph: {
        title: `${productCategory.name} | ${SITE.name}`,
        description,
        type: "website",
      },
    }
  } catch {
    notFound()
  }
}

export default async function CategoryPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const productCategory = await getCategoryByHandle(params.category)

  if (!productCategory) {
    notFound()
  }

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl(`/${params.countryCode}`) },
    { name: "Store", url: absoluteUrl(`/${params.countryCode}/store`) },
    {
      name: productCategory.name,
      url: absoluteUrl(
        `/${params.countryCode}/categories/${params.category.join("/")}`
      ),
    },
  ])

  return (
    <>
      <JsonLd data={breadcrumb} />
      <CategoryTemplate
        category={productCategory}
        sortBy={sortBy}
        page={page}
        countryCode={params.countryCode}
      />
    </>
  )
}

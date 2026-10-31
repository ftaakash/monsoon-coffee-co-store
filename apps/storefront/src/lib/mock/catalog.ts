import "server-only"

import { HttpTypes } from "@medusajs/types"

import type { BrewMethod, BrewRecipe } from "@lib/data/brews"
import type { CoffeeProfile } from "@lib/data/coffee-profiles"
import type { EventDetail } from "@lib/data/event-details"
import type { StoreFilterCategory } from "@lib/data/filter-categories"
import type { Review } from "@lib/data/reviews"

// Static catalogue for the frontend-only build. Everything the storefront used
// to read from the Medusa backend (regions, products, categories, brews, …)
// lives here, shaped like the Medusa Store API responses so the UI is unchanged.

const CURRENCY = "inr"
const IMG = {
  product: "/monsoon/images/Product.png",
  bags: "/monsoon/images/coffeebags.png",
  about1: "/monsoon/images/about1.png",
  about2: "/monsoon/images/about2.png",
  about3: "/monsoon/images/about3.png",
}

// ── Regions ────────────────────────────────────────────────────────────────

export const REGIONS = [
  {
    id: "reg_india",
    name: "India",
    currency_code: CURRENCY,
    automatic_taxes: true,
    countries: [
      {
        id: "in",
        iso_2: "in",
        iso_3: "ind",
        num_code: "356",
        name: "INDIA",
        display_name: "India",
        region_id: "reg_india",
      },
    ],
    payment_providers: [{ id: "pp_razorpay_razorpay", is_enabled: true }],
  },
] as unknown as HttpTypes.StoreRegion[]

// ── Categories, collections, filter tags ──────────────────────────────────

const category = (id: string, name: string, handle: string, rank: number) => ({
  id,
  name,
  handle,
  rank,
  description: "",
  parent_category: null,
  parent_category_id: null,
  category_children: [],
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
})

export const CATEGORIES = [
  category("pcat_beans", "Coffee Beans", "coffee-beans", 0),
  category("pcat_ground", "Ground Coffee", "ground-coffee", 1),
  category("pcat_gear", "Brew Gear", "brew-gear", 2),
  category("pcat_merch", "Merch", "merch", 3),
  category("pcat_events", "Events", "events", 4),
]

const collection = (id: string, title: string, handle: string) => ({
  id,
  title,
  handle,
  metadata: null,
  created_at: "2025-01-01T00:00:00.000Z",
  updated_at: "2025-01-01T00:00:00.000Z",
})

export const COLLECTIONS = [
  collection("pcol_reserve", "Monsoon Reserve", "monsoon-reserve"),
  collection("pcol_home", "Brew At Home", "brew-at-home"),
]

const tag = (id: string, value: string) => ({ id, value })

export const TAGS = {
  malabar: tag("ptag_malabar", "Malabar"),
  chikmagalur: tag("ptag_chikmagalur", "Chikmagalur"),
  coorg: tag("ptag_coorg", "Coorg"),
  araku: tag("ptag_araku", "Araku"),
  babaBudan: tag("ptag_bababudan", "Baba Budangiri"),
  monsooned: tag("ptag_monsooned", "Monsooned"),
  washed: tag("ptag_washed", "Washed"),
  natural: tag("ptag_natural", "Natural"),
  honey: tag("ptag_honey", "Honey"),
  light: tag("ptag_light", "Light Roast"),
  medium: tag("ptag_medium", "Medium Roast"),
  dark: tag("ptag_dark", "Dark Roast"),
}

export const FILTER_CATEGORIES: StoreFilterCategory[] = [
  {
    id: "fcat_origin",
    name: "Origin",
    handle: "origin",
    rank: 0,
    tags: [TAGS.malabar, TAGS.chikmagalur, TAGS.coorg, TAGS.araku, TAGS.babaBudan],
  },
  {
    id: "fcat_process",
    name: "Process",
    handle: "process",
    rank: 1,
    tags: [TAGS.monsooned, TAGS.washed, TAGS.natural, TAGS.honey],
  },
  {
    id: "fcat_roast",
    name: "Roast",
    handle: "roast",
    rank: 2,
    tags: [TAGS.light, TAGS.medium, TAGS.dark],
  },
]

// ── Products ───────────────────────────────────────────────────────────────

type VariantSeed = {
  title: string
  // option title → value, e.g. { Size: "250g" }
  options: Record<string, string>
  price: number
  originalPrice?: number
  // undefined = untracked (always in stock)
  stock?: number
}

type ProductSeed = {
  id: string
  handle: string
  title: string
  subtitle?: string
  description: string
  images: string[]
  categoryIds: string[]
  collectionId?: string
  tags: { id: string; value: string }[]
  shippingProfile?: "physical" | "digital"
  createdAt: string
  variants: VariantSeed[]
}

const buildProduct = (seed: ProductSeed): HttpTypes.StoreProduct => {
  const optionTitles = Object.keys(seed.variants[0].options)
  const options = optionTitles.map((title, i) => {
    const optionId = `${seed.id}_opt_${i}`
    const values = Array.from(
      new Set(seed.variants.map((v) => v.options[title]))
    ).map((value, j) => ({
      id: `${optionId}_val_${j}`,
      value,
      option_id: optionId,
    }))
    return { id: optionId, title, product_id: seed.id, values }
  })

  const images = seed.images.map((url, i) => ({
    id: `${seed.id}_img_${i}`,
    url,
    rank: i,
  }))

  const variants = seed.variants.map((v, i) => {
    const variantId = `${seed.id}_var_${i}`
    const onSale = v.originalPrice !== undefined && v.originalPrice > v.price
    return {
      id: variantId,
      title: v.title,
      sku: `${seed.handle}-${i}`.toUpperCase(),
      product_id: seed.id,
      manage_inventory: v.stock !== undefined,
      allow_backorder: false,
      inventory_quantity: v.stock ?? null,
      images,
      options: options.map((option) => {
        const value = option.values.find(
          (val) => val.value === v.options[option.title]
        )!
        return {
          id: value.id,
          value: value.value,
          option_id: option.id,
          option: { id: option.id, title: option.title },
        }
      }),
      calculated_price: {
        id: `${variantId}_price`,
        calculated_amount: v.price,
        original_amount: v.originalPrice ?? v.price,
        currency_code: CURRENCY,
        calculated_price: { price_list_type: onSale ? "sale" : null },
        original_price: { price_list_type: null },
      },
    }
  })

  const categories = CATEGORIES.filter((c) => seed.categoryIds.includes(c.id))
  const productCollection =
    COLLECTIONS.find((c) => c.id === seed.collectionId) ?? null

  return {
    id: seed.id,
    handle: seed.handle,
    title: seed.title,
    subtitle: seed.subtitle ?? null,
    description: seed.description,
    thumbnail: seed.images[0] ?? null,
    images,
    options,
    variants,
    tags: seed.tags,
    categories,
    collection: productCollection,
    collection_id: productCollection?.id ?? null,
    is_giftcard: false,
    discountable: true,
    status: "published",
    metadata: {},
    shipping_profile: {
      id: seed.shippingProfile === "digital" ? "sp_digital" : "sp_physical",
    },
    created_at: seed.createdAt,
    updated_at: seed.createdAt,
  } as unknown as HttpTypes.StoreProduct
}

const coffeeSizes = (prices: [number, number, number], stock?: number[]) =>
  (["250g", "500g", "1kg"] as const).map((size, i) => ({
    title: size,
    options: { Size: size },
    price: prices[i],
    stock: stock?.[i],
  }))

const PRODUCT_SEEDS: ProductSeed[] = [
  {
    id: "prod_malabar",
    handle: "monsooned-malabar-aa",
    title: "Monsooned Malabar AA",
    subtitle: "Direct Trade, Monsoon Aged, Freshly Roasted",
    description:
      "Our flagship. Arabica beans left open to the south-west monsoon winds on the Malabar coast until they swell, pale and mellow. Low acidity, heavy body, notes of dark chocolate, cedar and warm spice.",
    images: [IMG.product, IMG.bags, IMG.about1],
    categoryIds: ["pcat_beans"],
    collectionId: "pcol_reserve",
    tags: [TAGS.malabar, TAGS.monsooned, TAGS.medium],
    createdAt: "2025-06-10T00:00:00.000Z",
    variants: coffeeSizes([649, 1199, 2199], [40, 25, 10]),
  },
  {
    id: "prod_chikmagalur",
    handle: "chikmagalur-estate-washed",
    title: "Chikmagalur Estate Washed",
    subtitle: "Single Estate, Washed, Light Roast",
    description:
      "A bright, clean cup from the hills where Indian coffee began. Fully washed and sun dried for clarity: citrus peel, jaggery and a jasmine finish.",
    images: [IMG.bags, IMG.product],
    categoryIds: ["pcat_beans"],
    collectionId: "pcol_reserve",
    tags: [TAGS.chikmagalur, TAGS.washed, TAGS.light],
    createdAt: "2025-05-22T00:00:00.000Z",
    variants: coffeeSizes([549, 999, 1849]),
  },
  {
    id: "prod_coorg",
    handle: "coorg-honey-process",
    title: "Coorg Honey Process",
    subtitle: "Honey Process, Small Batch",
    description:
      "Dried with the sticky mucilage left on, so the sweetness stays in the bean. Stone fruit, brown sugar and a syrupy body. Roasted in small batches every week.",
    images: [IMG.product, IMG.about2],
    categoryIds: ["pcat_beans"],
    tags: [TAGS.coorg, TAGS.honey, TAGS.medium],
    createdAt: "2025-04-18T00:00:00.000Z",
    variants: coffeeSizes([599, 1099, 1999], [12, 6, 0]),
  },
  {
    id: "prod_araku",
    handle: "araku-valley-natural",
    title: "Araku Valley Natural",
    subtitle: "Tribal Grown, Natural Process, Light Roast",
    description:
      "Grown by Adivasi farming cooperatives in the Eastern Ghats and dried whole in the cherry. Expect berry jam, red wine and cocoa nibs.",
    images: [IMG.bags, IMG.about3],
    categoryIds: ["pcat_beans"],
    collectionId: "pcol_reserve",
    tags: [TAGS.araku, TAGS.natural, TAGS.light],
    createdAt: "2025-03-02T00:00:00.000Z",
    variants: coffeeSizes([699, 1299, 2399]),
  },
  {
    id: "prod_bababudan",
    handle: "baba-budangiri-dark-roast",
    title: "Baba Budangiri Dark Roast",
    subtitle: "Bold, Dark Roast, Ground To Order",
    description:
      "A deep, smoky roast for milk drinks and south Indian filter coffee. Ground to order for your brewer. Molasses, toasted almond and a long bittersweet finish.",
    images: [IMG.product],
    categoryIds: ["pcat_ground"],
    collectionId: "pcol_home",
    tags: [TAGS.babaBudan, TAGS.washed, TAGS.dark],
    createdAt: "2025-02-14T00:00:00.000Z",
    variants: ["Filter", "French Press", "Pour Over", "Espresso"].map(
      (grind) => ({
        title: grind,
        options: { Grind: grind },
        price: 499,
        originalPrice: 599,
      })
    ),
  },
  {
    id: "prod_pourover_kit",
    handle: "monsoon-pour-over-kit",
    title: "Monsoon Pour-Over Kit",
    subtitle: "Dripper, Server, Filters, 250g Beans",
    description:
      "Everything you need to start brewing by hand: a ceramic cone dripper, a 600ml glass server, 100 paper filters and a 250g bag of Monsooned Malabar.",
    images: [IMG.about1, IMG.bags],
    categoryIds: ["pcat_gear"],
    collectionId: "pcol_home",
    tags: [],
    createdAt: "2025-01-20T00:00:00.000Z",
    variants: [
      { title: "Default", options: { Kit: "Standard" }, price: 2499, stock: 5 },
    ],
  },
  {
    id: "prod_dripper",
    handle: "ceramic-cone-dripper",
    title: "Ceramic Cone Dripper",
    description:
      "A heavy-walled ceramic cone that holds its heat for an even extraction. Fits size 02 paper filters.",
    images: [IMG.about2],
    categoryIds: ["pcat_gear"],
    collectionId: "pcol_home",
    tags: [],
    createdAt: "2024-12-12T00:00:00.000Z",
    variants: ["Ink Black", "Monsoon Blue"].map((colour) => ({
      title: colour,
      options: { Colour: colour },
      price: 1299,
    })),
  },
  {
    id: "prod_mug",
    handle: "monsoon-enamel-mug",
    title: "Monsoon Enamel Mug",
    description:
      "A 350ml enamel camp mug with the Monsoon stamp. Light enough for the trail, tough enough for the office.",
    images: [IMG.about3],
    categoryIds: ["pcat_merch"],
    tags: [],
    createdAt: "2024-11-05T00:00:00.000Z",
    variants: [
      { title: "White", options: { Colour: "White" }, price: 699, stock: 20 },
      { title: "Black", options: { Colour: "Black" }, price: 699, stock: 0 },
    ],
  },
  {
    id: "prod_tote",
    handle: "roastery-canvas-tote",
    title: "Roastery Canvas Tote",
    description:
      "Heavyweight organic cotton tote, screen printed in Bengaluru. Fits three bags of beans and a laptop.",
    images: [IMG.bags],
    categoryIds: ["pcat_merch"],
    tags: [],
    createdAt: "2024-10-01T00:00:00.000Z",
    variants: [{ title: "Default", options: { Size: "One Size" }, price: 499 }],
  },
  {
    id: "prod_cupping",
    handle: "monsoon-cupping-session",
    title: "Monsoon Cupping Session",
    subtitle: "Taste, Score, Learn",
    description:
      "A two-hour guided cupping at the Indiranagar roastery. Taste six origins side by side and learn to score coffee like a Q grader.",
    images: [IMG.about2, IMG.about1],
    categoryIds: ["pcat_events"],
    tags: [],
    shippingProfile: "digital",
    createdAt: "2025-06-20T00:00:00.000Z",
    variants: [
      { title: "General", options: { Ticket: "General" }, price: 1500, stock: 18 },
    ],
  },
]

export const PRODUCTS: HttpTypes.StoreProduct[] = PRODUCT_SEEDS.map(buildProduct)

// ── Product extras (coffee profile, brew recipes, events, reviews) ─────────

export const COFFEE_PROFILES: Record<string, CoffeeProfile> = {
  prod_malabar: {
    id: "cp_malabar",
    product_id: "prod_malabar",
    origin: "Malabar Coast, Karnataka",
    altitude_m: 1100,
    varietal: "Kents, S795",
    process: "Monsooned",
    roast_level: "Medium",
    roast_date: "2025-06-01",
    harvest_year: 2024,
    recommended_ratio: "1:15",
    tasting_notes: ["Dark Chocolate", "Cedar", "Warm Spice"],
    extraction_profile: [
      { time_s: 0, yield_g: 0 },
      { time_s: 10, yield_g: 4 },
      { time_s: 20, yield_g: 16 },
      { time_s: 28, yield_g: 32 },
      { time_s: 35, yield_g: 40 },
    ],
  },
  prod_chikmagalur: {
    id: "cp_chikmagalur",
    product_id: "prod_chikmagalur",
    origin: "Chikmagalur, Karnataka",
    altitude_m: 1400,
    varietal: "SLN 9",
    process: "Washed",
    roast_level: "Light",
    harvest_year: 2024,
    recommended_ratio: "1:16",
    tasting_notes: ["Citrus Peel", "Jaggery", "Jasmine"],
  },
  prod_coorg: {
    id: "cp_coorg",
    product_id: "prod_coorg",
    origin: "Coorg, Karnataka",
    altitude_m: 1200,
    varietal: "Catuai",
    process: "Honey",
    roast_level: "Medium",
    harvest_year: 2024,
    recommended_ratio: "1:15",
    tasting_notes: ["Stone Fruit", "Brown Sugar"],
  },
  prod_araku: {
    id: "cp_araku",
    product_id: "prod_araku",
    origin: "Araku Valley, Andhra Pradesh",
    altitude_m: 1000,
    varietal: "Selection 795",
    process: "Natural",
    roast_level: "Light",
    harvest_year: 2024,
    recommended_ratio: "1:16",
    tasting_notes: ["Berry Jam", "Red Wine", "Cocoa Nib"],
  },
  prod_bababudan: {
    id: "cp_bababudan",
    product_id: "prod_bababudan",
    origin: "Baba Budangiri, Karnataka",
    altitude_m: 1500,
    varietal: "Chandragiri",
    process: "Washed",
    roast_level: "Dark",
    harvest_year: 2024,
    recommended_ratio: "1:12",
    tasting_notes: ["Molasses", "Toasted Almond"],
  },
}

const BREW_METHODS: Record<string, BrewMethod> = {
  pourover: {
    id: "bm_pourover",
    slug: "pour-over",
    name: "Pour Over",
    method_label: "Manual",
    summary: "Clean and bright. Best for lighter roasts.",
    image_url: IMG.about1,
    param_schema: [
      { key: "dose", label: "Dose", unit: "g" },
      { key: "water", label: "Water", unit: "ml" },
      { key: "temp", label: "Temp", unit: "°C" },
      { key: "time", label: "Time" },
    ],
    position: 0,
  },
  frenchpress: {
    id: "bm_frenchpress",
    slug: "french-press",
    name: "French Press",
    method_label: "Immersion",
    summary: "Full bodied and forgiving.",
    image_url: IMG.about2,
    param_schema: [
      { key: "dose", label: "Dose", unit: "g" },
      { key: "water", label: "Water", unit: "ml" },
      { key: "temp", label: "Temp", unit: "°C" },
      { key: "time", label: "Steep" },
    ],
    position: 1,
  },
  filter: {
    id: "bm_filter",
    slug: "south-indian-filter",
    name: "South Indian Filter",
    method_label: "Drip",
    summary: "Strong decoction for milky filter kaapi.",
    image_url: IMG.about3,
    param_schema: [
      { key: "dose", label: "Dose", unit: "g" },
      { key: "water", label: "Water", unit: "ml" },
      { key: "time", label: "Drip" },
    ],
    position: 2,
  },
}

const recipe = (
  productId: string,
  method: keyof typeof BREW_METHODS,
  params: Record<string, string>
): BrewRecipe => ({
  id: `br_${productId}_${method}`,
  product_id: productId,
  title: BREW_METHODS[method].name,
  summary: BREW_METHODS[method].summary,
  params,
  steps: [
    { name: "Grind", description: "Grind just before brewing." },
    { name: "Bloom", description: "Wet the grounds and wait 30 seconds." },
    { name: "Brew", description: "Pour the rest of the water slowly." },
    { name: "Serve", description: "Swirl, pour and enjoy." },
  ],
  brew_method: BREW_METHODS[method],
})

const standardBrews = (productId: string) => [
  recipe(productId, "pourover", { dose: "15", water: "250", temp: "93", time: "3:00" }),
  recipe(productId, "frenchpress", { dose: "30", water: "500", temp: "95", time: "4:00" }),
  recipe(productId, "filter", { dose: "20", water: "100", time: "15:00" }),
]

export const BREWS: Record<string, BrewRecipe[]> = Object.fromEntries(
  ["prod_malabar", "prod_chikmagalur", "prod_coorg", "prod_araku", "prod_bababudan"].map(
    (id) => [id, standardBrews(id)]
  )
)

// Categories whose products show the Brew Lab section.
export const BREW_LAB_CATEGORY_IDS = ["pcat_beans", "pcat_ground"]

export const EVENT_DETAILS: Record<string, EventDetail> = {
  prod_cupping: {
    id: "ev_cupping",
    product_id: "prod_cupping",
    partner: "Monsoon Roastery Team",
    venue: "Monsoon Roastery, 100 Feet Road, Indiranagar",
    city: "Bengaluru",
    date_label: "Every Saturday",
    start_time: "10:00",
    end_time: "12:00",
    seats_total: 18,
    booking_closed: false,
    description:
      "Join our head roaster for a hands-on **cupping session**. We'll walk through aroma, acidity, body and finish across six Indian origins.\n\nCoffee and snacks included.",
    highlights: [
      "Six origins cupped side by side",
      "Take-home scoring sheet",
      "10% off beans on the day",
    ],
    images: [IMG.about2, IMG.about1],
  },
}

export const SEED_REVIEWS: Review[] = [
  {
    id: "rev_1",
    product_id: "prod_malabar",
    customer_name: "Ananya R.",
    variant_title: "500g",
    rating: 5,
    title: "My daily cup",
    body: "Smooth, chocolatey and no sourness at all. Works great in my moka pot.",
    status: "published",
    created_at: "2025-06-15T09:00:00.000Z",
  },
  {
    id: "rev_2",
    product_id: "prod_malabar",
    customer_name: "Karthik S.",
    variant_title: "250g",
    rating: 4,
    title: "Great body",
    body: "Heavy and earthy. I'd love a slightly lighter roast option, but still excellent.",
    status: "published",
    created_at: "2025-06-02T09:00:00.000Z",
  },
  {
    id: "rev_3",
    product_id: "prod_chikmagalur",
    customer_name: "Meera P.",
    variant_title: "250g",
    rating: 5,
    title: "So bright",
    body: "Tastes like orange peel in a V-style pour over. Lovely.",
    status: "published",
    created_at: "2025-05-30T09:00:00.000Z",
  },
]

// ── Checkout options ───────────────────────────────────────────────────────

export const SHIPPING_OPTIONS = [
  {
    id: "so_standard",
    name: "Standard Delivery",
    price_type: "flat",
    amount: 0,
    shipping_profile_id: "sp_physical",
    service_zone_id: "serzo_india",
    provider_id: "manual_manual",
    data: { description: "3–5 business days" },
    type: { label: "Standard", description: "3–5 business days", code: "standard" },
  },
  {
    id: "so_express",
    name: "Express Delivery",
    price_type: "flat",
    amount: 149,
    shipping_profile_id: "sp_physical",
    service_zone_id: "serzo_india",
    provider_id: "manual_manual",
    data: { description: "1–2 business days" },
    type: { label: "Express", description: "1–2 business days", code: "express" },
  },
  {
    id: "so_digital",
    name: "Digital Delivery",
    price_type: "flat",
    amount: 0,
    shipping_profile_id: "sp_digital",
    service_zone_id: "serzo_india",
    provider_id: "manual_manual",
    data: { description: "Tickets are emailed instantly" },
    type: { label: "Digital", description: "Emailed instantly", code: "digital" },
  },
] as unknown as HttpTypes.StoreCartShippingOption[]

export const PAYMENT_PROVIDERS = [
  { id: "pp_razorpay_razorpay", is_enabled: true },
] as unknown as HttpTypes.StorePaymentProvider[]

// Demo promo codes accepted at checkout. Percentage discounts only.
export const PROMO_CODES: Record<string, number> = {
  MONSOON10: 10,
  FIRSTBREW: 15,
}

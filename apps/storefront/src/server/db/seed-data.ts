import type { BrewMethod, BrewRecipe } from "@lib/data/brews"
import type { CoffeeProfile } from "@lib/data/coffee-profiles"
import type { EventDetail } from "@lib/data/event-details"
import type { Review } from "@lib/data/reviews"

// Starting data for a fresh database. seed.ts inserts all of this the first
// time the database file is created; after that the database is the source of
// truth and the admin panel edits it.

const IMG = {
  product: "/monsoon/images/Product.png",
  bags: "/monsoon/images/coffeebags.png",
  about1: "/monsoon/images/about1.png",
  about2: "/monsoon/images/about2.png",
  about3: "/monsoon/images/about3.png",
}

// ── Categories, collections, filter tags ──────────────────────────────────

const category = (
  id: string,
  name: string,
  handle: string,
  rank: number,
  showBrewLab = false
) => ({
  id,
  name,
  handle,
  rank,
  // Products in these categories show the Brew Lab section.
  show_brew_lab: showBrewLab,
})

export const CATEGORIES = [
  category("pcat_beans", "Coffee Beans", "coffee-beans", 0, true),
  category("pcat_ground", "Ground Coffee", "ground-coffee", 1, true),
  category("pcat_gear", "Brew Gear", "brew-gear", 2),
  category("pcat_merch", "Merch", "merch", 3),
  category("pcat_events", "Events", "events", 4),
]

const collection = (id: string, title: string, handle: string) => ({
  id,
  title,
  handle,
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

export const FILTER_CATEGORIES = [
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

export type VariantSeed = {
  title: string
  // option title → value, e.g. { Size: "250g" }
  options: Record<string, string>
  price: number
  originalPrice?: number
  // undefined = untracked (always in stock)
  stock?: number
}

export type ProductSeed = {
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

const coffeeSizes = (prices: [number, number, number], stock?: number[]) =>
  (["250g", "500g", "1kg"] as const).map((size, i) => ({
    title: size,
    options: { Size: size },
    price: prices[i],
    stock: stock?.[i],
  }))

export const PRODUCT_SEEDS: ProductSeed[] = [
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

export const BREW_METHODS: Record<string, BrewMethod> = {
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

// Sample customer reviews, 2–3 per product. Missing ones are inserted on every
// start (see syncSeedReviews), so databases created before a review was added
// here pick it up too.
const review = (
  id: string,
  product_id: string,
  customer_name: string,
  variant_title: string | null,
  rating: number,
  title: string,
  body: string,
  created_at: string
): Review => ({
  id,
  product_id,
  customer_name,
  variant_title,
  rating,
  title,
  body,
  status: "published",
  created_at: `${created_at}T09:00:00.000Z`,
})

export const SEED_REVIEWS: Review[] = [
  // Monsooned Malabar AA
  review("rev_1", "prod_malabar", "Ananya R.", "500g", 5, "My daily cup", "Smooth, chocolatey and no sourness at all. Works great in my moka pot.", "2025-06-15"),
  review("rev_2", "prod_malabar", "Karthik S.", "250g", 4, "Great body", "Heavy and earthy. I'd love a slightly lighter roast option, but still excellent.", "2025-06-02"),
  review("rev_malabar_3", "prod_malabar", "Farhan Q.", "1kg", 5, "Worth the bulk bag", "Bought the 1kg for the office. Holds up well for two weeks if you keep it sealed, and everyone asks what it is.", "2025-07-08"),

  // Chikmagalur Estate Washed
  review("rev_3", "prod_chikmagalur", "Meera P.", "250g", 5, "So bright", "Tastes like orange peel in a V-style pour over. Lovely.", "2025-05-30"),
  review("rev_chik_2", "prod_chikmagalur", "Rohit B.", "500g", 4, "Clean and floral", "Very clean cup with a jasmine finish. A bit too light for milk, so I keep it for black coffee.", "2025-06-21"),
  review("rev_chik_3", "prod_chikmagalur", "Lakshmi V.", "250g", 5, "Proud of Indian coffee", "Didn't know Indian beans could taste this delicate. Brewed at 92°C with a 1:16 ratio and it was perfect.", "2025-07-02"),

  // Coorg Honey Process
  review("rev_coorg_1", "prod_coorg", "Sneha K.", "250g", 5, "Naturally sweet", "No sugar needed. Stone fruit and brown sugar, exactly like the label says.", "2025-05-12"),
  review("rev_coorg_2", "prod_coorg", "Vikram J.", "500g", 4, "Syrupy body", "Thick, sweet and easy to brew. The 1kg was sold out, so I hope it comes back.", "2025-06-04"),
  review("rev_coorg_3", "prod_coorg", "Divya M.", "250g", 4, "Great in a French press", "Rich and round in a French press. Slightly muddy in my AeroPress, so I'll grind coarser next time.", "2025-06-27"),

  // Araku Valley Natural
  review("rev_araku_1", "prod_araku", "Arjun M.", "250g", 5, "Like berry jam", "First natural process coffee I've tried and it's wild: berries and red wine. Gifted a bag to my brother too.", "2025-04-02"),
  review("rev_araku_2", "prod_araku", "Pooja N.", "500g", 4, "Fruity, not for everyone", "I love it, my husband finds it too fruity. Brew it a little cooler (90°C) or it turns sharp.", "2025-04-24"),
  review("rev_araku_3", "prod_araku", "Sanjay T.", "250g", 5, "Supports a great cause", "Lovely cup, and it's good to know it comes from farming cooperatives. Fresh roast date too.", "2025-05-19"),

  // Baba Budangiri Dark Roast
  review("rev_bb_1", "prod_bababudan", "Ramesh I.", "Filter", 5, "Proper filter kaapi", "Strong decoction, just like home in Chennai. Mix with hot milk and a little sugar.", "2025-03-01"),
  review("rev_bb_2", "prod_bababudan", "Neha S.", "Espresso", 4, "Bold for lattes", "Cuts through milk nicely. A bit too smoky for me as a straight espresso.", "2025-03-22"),
  review("rev_bb_3", "prod_bababudan", "Imran A.", "French Press", 4, "Good value on sale", "Smoky, nutty and strong. Great price at ₹499. The grind was spot on for my press.", "2025-04-10"),

  // Monsoon Pour-Over Kit
  review("rev_kit_1", "prod_pourover_kit", "Priya R.", "Default", 5, "Perfect starter kit", "Everything you need in one box. The guide card helped me get a good cup on day one.", "2025-02-10"),
  review("rev_kit_2", "prod_pourover_kit", "Aditya G.", "Default", 4, "Lovely gift", "Bought it for my dad. The glass server is a bit thin, but the dripper is solid.", "2025-03-05"),

  // Ceramic Cone Dripper
  review("rev_drip_1", "prod_dripper", "Kavya L.", "Monsoon Blue", 5, "Beautiful and heavy", "The blue glaze is gorgeous and it holds heat well. Draws down evenly with size 02 filters.", "2025-01-18"),
  review("rev_drip_2", "prod_dripper", "Harish P.", "Ink Black", 4, "Solid dripper", "Brews consistently. Wish it came with a few filters to start with.", "2025-02-26"),

  // Monsoon Enamel Mug
  review("rev_mug_1", "prod_mug", "Asha M.", "White", 5, "Camping favourite", "Took it on a Coorg trek. Light, tough and the stamp still looks great after many washes.", "2024-12-20"),
  review("rev_mug_2", "prod_mug", "Siddharth R.", "White", 3, "Gets hot to hold", "Looks great, but enamel gets hot quickly. Fine for coffee that's cooled a little.", "2025-01-11"),

  // Roastery Canvas Tote
  review("rev_tote_1", "prod_tote", "Nandini H.", "Default", 5, "Sturdy and roomy", "Fits my laptop and groceries. The print hasn't faded after several washes.", "2024-11-02"),
  review("rev_tote_2", "prod_tote", "Gaurav D.", "Default", 4, "Nice canvas", "Heavyweight fabric and good stitching. An inside pocket would make it perfect.", "2024-12-08"),

  // Monsoon Cupping Session
  review("rev_cup_1", "prod_cupping", "Rahul V.", "General", 5, "Learned so much", "Two hours flew by. Tasting six origins side by side finally made 'acidity' make sense to me.", "2025-06-28"),
  review("rev_cup_2", "prod_cupping", "Shreya C.", "General", 5, "Great Saturday plan", "Friendly roasters, small group, and the 10% off beans afterwards was a nice touch.", "2025-07-05"),
  review("rev_cup_3", "prod_cupping", "Anil K.", "General", 4, "Fun but a bit fast", "Really enjoyed it. The scoring section felt rushed for beginners, but they answered every question.", "2025-07-12"),
]

// ── Checkout options ───────────────────────────────────────────────────────

export const SHIPPING_OPTIONS = [
  { id: "so_standard", name: "Standard Delivery", code: "standard", amount: 0, shipping_profile: "physical", description: "3–5 business days" },
  { id: "so_express", name: "Express Delivery", code: "express", amount: 149, shipping_profile: "physical", description: "1–2 business days" },
  { id: "so_digital", name: "Digital Delivery", code: "digital", amount: 0, shipping_profile: "digital", description: "Tickets are emailed instantly" },
]

// Percentage discounts accepted at checkout.
export const PROMO_CODES = [
  { code: "MONSOON10", percent: 10 },
  { code: "FIRSTBREW", percent: 15 },
]

export const DEMO_CUSTOMER = {
  id: "cus_demo",
  email: "demo@monsoon.test",
  password: "monsoon123",
  first_name: "Asha",
  last_name: "Menon",
  phone: "9876543210",
  created_at: "2025-01-15T10:00:00.000Z",
  address: {
    id: "addr_demo",
    first_name: "Asha",
    last_name: "Menon",
    company: "",
    address_1: "12, 4th Cross, Indiranagar",
    address_2: "",
    city: "Bengaluru",
    province: "Karnataka",
    postal_code: "560038",
    country_code: "in",
    phone: "9876543210",
  },
}

export const DEMO_ADMIN = {
  id: "adm_demo",
  email: "admin@monsoon.test",
  password: "admin12345",
  name: "Roastery Admin",
}

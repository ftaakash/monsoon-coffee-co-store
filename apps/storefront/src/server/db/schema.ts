// Database schema. Run on every start with CREATE TABLE IF NOT EXISTS, so a
// fresh database file gets every table and an existing one is left alone.
//
// Conventions: ids are prefixed text ids ("prod_…", "cus_…"), money is stored
// in whole rupees as INTEGER, timestamps are ISO-8601 TEXT, and booleans are
// INTEGER 0/1. Columns ending in _json hold display-only nested data that is
// always read and written as a whole (addresses on an order, brew steps, …).

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS categories (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  handle        TEXT NOT NULL UNIQUE,
  rank          INTEGER NOT NULL DEFAULT 0,
  show_brew_lab INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS collections (
  id     TEXT PRIMARY KEY,
  title  TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tags (
  id    TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Groups of tags shown as store filters (Origin, Process, Roast).
CREATE TABLE IF NOT EXISTS filter_categories (
  id     TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  handle TEXT NOT NULL UNIQUE,
  rank   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS filter_category_tags (
  filter_category_id TEXT NOT NULL REFERENCES filter_categories(id) ON DELETE CASCADE,
  tag_id             TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  rank               INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (filter_category_id, tag_id)
);

CREATE TABLE IF NOT EXISTS products (
  id               TEXT PRIMARY KEY,
  handle           TEXT NOT NULL UNIQUE,
  title            TEXT NOT NULL,
  subtitle         TEXT,
  description      TEXT NOT NULL DEFAULT '',
  images_json      TEXT NOT NULL DEFAULT '[]',
  collection_id    TEXT REFERENCES collections(id) ON DELETE SET NULL,
  -- 'physical' ships by courier; 'digital' (event tickets) is delivered instantly.
  shipping_profile TEXT NOT NULL DEFAULT 'physical' CHECK (shipping_profile IN ('physical', 'digital')),
  status           TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, tag_id)
);

CREATE TABLE IF NOT EXISTS variants (
  id               TEXT PRIMARY KEY,
  product_id       TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  sku              TEXT UNIQUE,
  -- option title -> value, e.g. {"Size": "250g"}
  options_json     TEXT NOT NULL DEFAULT '{}',
  price            INTEGER NOT NULL CHECK (price >= 0),
  original_price   INTEGER CHECK (original_price IS NULL OR original_price >= 0),
  -- When manage_inventory is 0 the variant is always in stock and stock is NULL.
  manage_inventory INTEGER NOT NULL DEFAULT 0,
  stock            INTEGER CHECK (stock IS NULL OR stock >= 0),
  rank             INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

CREATE TABLE IF NOT EXISTS coffee_profiles (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  data_json  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brew_methods (
  id        TEXT PRIMARY KEY,
  data_json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS brew_recipes (
  id             TEXT PRIMARY KEY,
  product_id     TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  brew_method_id TEXT NOT NULL REFERENCES brew_methods(id),
  data_json      TEXT NOT NULL,
  rank           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS event_details (
  product_id TEXT PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  data_json  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_options (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  code             TEXT NOT NULL,
  amount           INTEGER NOT NULL DEFAULT 0,
  shipping_profile TEXT NOT NULL,
  description      TEXT
);

CREATE TABLE IF NOT EXISTS promo_codes (
  code    TEXT PRIMARY KEY,
  percent INTEGER NOT NULL CHECK (percent BETWEEN 1 AND 100),
  active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS customers (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  phone         TEXT NOT NULL DEFAULT '',
  -- scrypt hash "salt:hash"; NULL for accounts that only sign in with a code.
  password_hash TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS addresses (
  id                  TEXT PRIMARY KEY,
  customer_id         TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  first_name          TEXT NOT NULL DEFAULT '',
  last_name           TEXT NOT NULL DEFAULT '',
  company             TEXT NOT NULL DEFAULT '',
  address_1           TEXT NOT NULL DEFAULT '',
  address_2           TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  province            TEXT NOT NULL DEFAULT '',
  postal_code         TEXT NOT NULL DEFAULT '',
  country_code        TEXT NOT NULL DEFAULT 'in',
  phone               TEXT NOT NULL DEFAULT '',
  is_default_shipping INTEGER NOT NULL DEFAULT 0,
  is_default_billing  INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);

-- Shopper sign-ins. The token is the value of the httpOnly session cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carts (
  id                     TEXT PRIMARY KEY,
  region_id              TEXT NOT NULL,
  customer_id            TEXT REFERENCES customers(id) ON DELETE SET NULL,
  email                  TEXT,
  shipping_address_json  TEXT,
  billing_address_json   TEXT,
  shipping_option_ids_json TEXT NOT NULL DEFAULT '[]',
  promo_codes_json       TEXT NOT NULL DEFAULT '[]',
  -- Set when checkout starts; cleared whenever the cart changes.
  payment_session_id     TEXT,
  completed_at           TEXT,
  created_at             TEXT NOT NULL,
  updated_at             TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cart_items (
  id         TEXT PRIMARY KEY,
  cart_id    TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES variants(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  created_at TEXT NOT NULL,
  UNIQUE (cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                    TEXT PRIMARY KEY,
  display_id            INTEGER NOT NULL UNIQUE,
  customer_id           TEXT REFERENCES customers(id) ON DELETE SET NULL,
  email                 TEXT NOT NULL,
  -- pending -> completed, or canceled
  status                TEXT NOT NULL DEFAULT 'pending',
  -- not_fulfilled -> shipped -> out_for_delivery -> delivered (or fulfilled for tickets)
  fulfillment_status    TEXT NOT NULL DEFAULT 'not_fulfilled',
  payment_status        TEXT NOT NULL DEFAULT 'captured',
  region_id             TEXT NOT NULL,
  currency_code         TEXT NOT NULL,
  shipping_address_json TEXT,
  billing_address_json  TEXT,
  shipping_methods_json TEXT NOT NULL DEFAULT '[]',
  promotions_json       TEXT NOT NULL DEFAULT '[]',
  fulfillments_json     TEXT NOT NULL DEFAULT '[]',
  metadata_json         TEXT NOT NULL DEFAULT '{}',
  subtotal              INTEGER NOT NULL,
  discount_total        INTEGER NOT NULL DEFAULT 0,
  shipping_total        INTEGER NOT NULL DEFAULT 0,
  tax_total             INTEGER NOT NULL DEFAULT 0,
  total                 INTEGER NOT NULL,
  canceled_at           TEXT,
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

-- A snapshot of each line at the time of purchase, so later price or title
-- changes in the catalogue don't rewrite past orders.
CREATE TABLE IF NOT EXISTS order_items (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    TEXT,
  variant_id    TEXT,
  product_title TEXT NOT NULL,
  product_handle TEXT,
  variant_title TEXT,
  thumbnail     TEXT,
  is_digital    INTEGER NOT NULL DEFAULT 0,
  quantity      INTEGER NOT NULL,
  unit_price    INTEGER NOT NULL,
  total         INTEGER NOT NULL,
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,
  product_id    TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id   TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  variant_id    TEXT,
  variant_title TEXT,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT NOT NULL,
  images_json   TEXT NOT NULL DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read')),
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  email      TEXT PRIMARY KEY COLLATE NOCASE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token      TEXT PRIMARY KEY,
  admin_id   TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
`

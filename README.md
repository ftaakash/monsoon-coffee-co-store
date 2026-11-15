# Monsoon Coffee Co. — Storefront, API and Admin

The Monsoon Coffee Co. online store, built with Next.js. One app contains three
parts:

- **Storefront** (`/in/...`): browse, shop, check out and manage an account.
- **REST API** (`/api/store/...` and `/api/admin/...`): Next.js route handlers
  backed by a **SQLite** database.
- **Admin panel** (`/admin`): manage orders, products, stock, customers,
  contact messages and reviews.

There is no Docker, Postgres or Redis. The database is a single file that is
created and filled with sample data the first time the app starts.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/). It ships with Node through corepack: run
  `corepack enable` once, or prefix the commands below with `corepack`.

## Run it locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:8000 (the store redirects to `/in`) and
http://localhost:8000/admin for the admin panel.

To run the optimised production build instead:

```bash
pnpm build
pnpm start
```

To start again from the sample data, stop the server and run:

```bash
pnpm db:reset
```

No environment variables are required. To change the defaults, copy
`apps/storefront/.env.template` to `apps/storefront/.env.local`.

## Demo logins

| What | Value |
|------|-------|
| Shopper account | `demo@monsoon.test` / `monsoon123` (saved address, one delivered order) |
| Admin account | `admin@monsoon.test` / `admin12345` |
| One-time login / password code | `123456` (no emails are sent) |
| Promo codes | `MONSOON10` (10% off), `FIRSTBREW` (15% off) |
| Payment | Demo only. "Place order" completes the order without charging anything |

## How it fits together

```
Browser ──► Next.js pages (src/app/[countryCode])
               │  server components and server actions
               ▼
            src/lib/data/*  ── fetch() with the shopper's session token ──►  /api/store/*
                                                                                 │
Admin panel (src/app/admin) ── src/lib/admin/* ── fetch() ──►  /api/admin/*      │
                                                                  │              │
                                                                  ▼              ▼
                                                     src/server/services/*  (business rules)
                                                                  │
                                                                  ▼
                                                     src/server/db  ──►  data/monsoon.db (SQLite)
```

| Folder (under `apps/storefront/src`) | What it does |
|---|---|
| `server/db/schema.ts` | Every table: products, variants, carts, orders, customers, sessions, reviews, messages… |
| `server/db/seed.ts`, `seed-data.ts` | Sample catalogue, demo shopper, demo admin and order #1001, inserted into an empty database |
| `server/services/*` | The backend logic: catalogue, carts and totals, orders, customers and sign-in, reviews and contact, admin |
| `server/http.ts` | Wraps every route: JSON responses, error codes, shopper/admin authentication |
| `app/api/store/*` | Public store API used by the storefront |
| `app/api/admin/*` | Admin API; every route requires an admin session |
| `lib/data/*` | The storefront's server actions; they call the store API |
| `app/admin/*`, `lib/admin/*`, `modules/admin/*` | Admin panel pages, its API client and form actions, its UI pieces |

### Security notes

- Passwords are stored as salted **scrypt** hashes, never in plain text.
- Sign-ins are random session tokens stored in the `sessions` table and kept in
  an **httpOnly** cookie, so page scripts can't read them. Signing out deletes
  the session on the server.
- Shopper and admin sessions are separate; every `/api/admin` route checks for
  an admin session.
- Stock is re-checked on the server and reserved inside a database transaction
  when an order is placed, so two shoppers can't buy the last unit.
- One-time codes are fixed (`123456`) because there is no email service.

## Main API endpoints

| Method and path | Purpose |
|---|---|
| `GET /api/store/products?category_id=&tag_id=&q=&limit=&offset=` | List and filter products |
| `POST /api/store/carts` | Create a cart |
| `POST /api/store/carts/:id/line-items` | Add an item (`variant_id`, `quantity`) |
| `POST /api/store/carts/:id` | Email, addresses, promo codes |
| `POST /api/store/carts/:id/complete` | Place the order |
| `POST /api/store/auth/login`, `/auth/register`, `/auth/code`, `/auth/code/verify` | Sign in and sign up |
| `GET /api/store/customers/me`, `/customers/me/orders` | The signed-in shopper |
| `POST /api/store/contact` | Contact form (appears in the admin inbox) |
| `POST /api/admin/auth` | Admin sign-in |
| `GET /api/admin/stats` | Dashboard numbers |
| `POST /api/admin/orders/:id/status` | `shipped`, `out_for_delivery`, `delivered` or `canceled` |
| `POST /api/admin/products`, `/products/:id`, `/variants/:id` | Create and edit products, prices and stock |

Every route lives at the matching path under `apps/storefront/src/app/api`.

## Pages

**Store:** home, store (filters, sorting, pagination), product detail (variants,
stock, brew lab, coffee profile, reviews), categories, collections, events, cart
(promo codes, pincode check), checkout, order confirmation with a downloadable
receipt, account (dashboard, orders with tracking and tickets, addresses,
profile and password), sign in (password or one-time code), register, about,
contact and the policy pages.

**Admin:** dashboard (revenue, orders to ship, low stock, top products), orders
(filter, search, ship / out for delivery / deliver / cancel), products (create,
edit, publish or hide, prices, stock, variants, images, categories and filter
tags), customers, contact messages, and review moderation.

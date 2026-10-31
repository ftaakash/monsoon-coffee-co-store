# Monsoon Coffee Co. — Storefront (frontend only)

The Monsoon Coffee Co. Next.js storefront, set up to run on its own with no
backend. Medusa, Postgres, Redis, Razorpay and the Docker/nginx deploy setup
have been removed. Every page reads from a local mock data layer instead, so
you can browse, shop, check out and manage an account entirely on your machine.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/). It ships with Node through corepack: run
  `corepack enable` once, or prefix the commands below with `corepack`.

## Run it locally

```bash
pnpm install
pnpm dev
```

Open http://localhost:8000. It redirects to the India store at `/in`.

To run the optimised production build instead:

```bash
pnpm build
pnpm start
```

No environment variables are required. To change the defaults, copy
`apps/storefront/.env.template` to `apps/storefront/.env.local`.

## Demo data

| What | Value |
|------|-------|
| Demo account | `demo@monsoon.test` / `monsoon123` (has a saved address and a delivered order) |
| One-time login / password code | `123456` (no emails are sent) |
| Promo codes | `MONSOON10` (10% off), `FIRSTBREW` (15% off) |
| Payment | Demo only. "Place order" completes the order without charging anything |

You can also register a new account, or check out as a guest.

## How it works

- `apps/storefront/src/lib/mock/catalog.ts` holds the catalogue: products,
  variants, prices, stock, categories, collections, filter tags, coffee
  profiles, brew recipes, event details, seed reviews, shipping options and
  promo codes. Edit this file to change what the store sells.
- `apps/storefront/src/lib/mock/db.ts` is an in-memory store for carts,
  customers, sessions, orders, reviews and stock levels. It is shaped like the
  Medusa Store API, so the UI components are unchanged.
- `apps/storefront/src/lib/data/*` are the server actions the pages call. They
  keep their original signatures and now read from and write to the mock store.

State is kept in server memory. It survives hot reloads but resets when the
server restarts. Carts and sign-ins are tied to cookies, so after a restart
you start with an empty cart and are signed out.

## Pages

Home, store (filters, sorting, pagination), product detail (variants, stock,
brew lab, coffee profile, reviews), categories, collections, events, cart
(promo codes, pincode check), checkout, order confirmation with a downloadable
receipt, account (dashboard, orders with tracking and tickets, addresses,
profile and password), sign in (password or one-time code), register, about,
contact, and the policy pages.

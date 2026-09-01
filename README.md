# Rare Naari — Premium Womenswear E-commerce Platform

Production-ready clothing commerce platform: customer storefront + full admin console + analytics, built with Next.js 16, TypeScript, PostgreSQL and Prisma.

## Run locally

```bash
npm install
cp .env.example .env          # set DATABASE_URL to your local Postgres
npx prisma migrate deploy     # create tables
npx prisma generate
npm run db:seed               # demo catalog + admin user + CMS pages
npm run dev                   # http://localhost:3000
```

- Storefront: http://localhost:3000
- Admin: http://localhost:3000/admin — `admin@rarenaari.com` / `RareNaari@2026` (change after first login)
- Without Razorpay keys, checkout uses a **development payment simulator** so the whole order lifecycle can be tested locally. It is disabled in production automatically.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` / `npm start` | production build / serve |
| `npm test` | unit tests (pricing, discounts, inventory states, order flow, markdown) |
| `npm run db:seed` | seed demo data (idempotent) |
| `npx prisma migrate dev` | create a migration after schema changes |

## Deploying on Render

1. Push this repo to GitHub and create a **Blueprint** on Render — `render.yaml` provisions the web service + Postgres + a persistent disk for uploaded images.
2. Set env vars in the Render dashboard (see `.env.example`): `DATABASE_URL` comes from the Render database, `NEXT_PUBLIC_APP_URL` is your domain.
3. Migrations run automatically on every deploy (`prisma migrate deploy` in the build command). Seed once from the Render shell: `npm run db:seed`.
4. **Razorpay**: add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, then create a webhook in the Razorpay dashboard pointing to `https://<domain>/api/webhooks/razorpay` (events: `payment.captured`, `payment.failed`) and put its secret in `RAZORPAY_WEBHOOK_SECRET`. No code changes needed.
5. **Delivery partner (later)**: implement one adapter in `src/lib/delivery/<partner>.ts` conforming to the `DeliveryProvider` interface, register it in `factory.ts`, set `DELIVERY_PROVIDER` + credentials. Orders, shipments and tracking need **zero** changes.
6. **Email**: set the business mailbox SMTP creds (`EMAIL_*`). Until configured, emails are logged to the server console instead of failing orders.

## Architecture notes

- **Money** is stored in paise (integers); discount % is always derived — admins never type it.
- **Inventory** is race-safe: row-level locks (`SELECT … FOR UPDATE`), a reserve→commit/release lifecycle around payment, and an audited `InventoryTransaction` ledger for every change. Expired unpaid orders auto-release their reservations.
- **Payments** are verified server-side (checkout signature HMAC + idempotent webhook with a deduped `WebhookEvent` ledger). A duplicate webhook can never double-deduct stock or double-count revenue.
- **Draft vs live**: editing a *published* product saves to `draftData`; the storefront keeps serving the live version until **Publish**. Stock changes are the exception — they apply live immediately by design.
- **Analytics** is first-party: a tiny `track()` client posts to `/api/events`; dashboards (overview, funnel, product, search, realtime) read from the same Postgres. No PII: anonymous visitor/session cookies, country only from CDN headers, IPs never stored.
- **SEO**: server-rendered pages, canonical URLs, sitemap.xml, robots.txt, Product/Organization/Website/Breadcrumb/FAQ JSON-LD, per-entity meta with sensible defaults.

## Where things live

```
prisma/schema.prisma        # full data model
prisma/seed.ts              # demo data (safe to re-run)
src/lib/                    # domain services (cart, orders, inventory, coupons, razorpay, delivery, email, analytics)
src/app/(store)/            # customer storefront
src/app/admin/(panel)/      # admin console
src/app/api/                # customer APIs + webhooks
src/app/api/admin/          # admin APIs (role-guarded)
src/components/store|admin  # UI components
```

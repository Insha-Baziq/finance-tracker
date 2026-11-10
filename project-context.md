# Finance Tracker — Project Context

Last reviewed: 2026-10-11

## Purpose

Finance Tracker is a private, single-user dashboard for recording freelance income, business expenses, refunds, and charitable giving. It is oriented around Fiverr and Upwork work, with bank payments and manually entered transactions also supported. The app summarizes cash flow, tracks clients by username, and can display amounts in USD or converted PKR.

## Domain language and rules

- **Transaction** is the common record. Its `type` is `payment`, `expense`, or `refund`; records also have an ID, amount, description, and creation timestamp.
- **Payment** is incoming client income. `source` is currently `fiverr`, `upwork`, or `bank`. Payments can include order and clearing dates, status, client `username`, order ID, gross amount, fees, and net amount. `amount` is the gross amount charged to the client, before platform fees. `fees` is the amount withheld by a marketplace; `netAmount` is the amount received after those fees. Fiverr uses the app's existing 20% fee calculation. Upwork fees vary by contract, so record the actual fee shown for each payment. Bank transfers normally have no platform fee.
- **Clearing payment** has status `Clearing`; **completed payment** has status `Completed`. The daily cron changes a clearing payment to completed once its clearing date is today or earlier, then creates a notification.
- **Expense** is an outgoing cost, with an expense name, category, and expense date.
- **Refund** is its own transaction. `refundFor` says whether it refunds a payment or expense, and `refundedTransactionId` points to that original record. Refunds can be partial, and several refunds can reference one transaction. Keep the original record intact when recording a refund; deleting a transaction does not cascade to linked records.
- **Client** is not a separate stored entity. A client is derived from a payment's free-text `username`; refunds against those payments are attributed back to that username. Empty usernames do not create a client.
- **Category** is a named label for expenses. If no categories are stored, the app initializes `Subscription`, `Tools`, `Services`, and `Other`.
- **Amounts** are recorded in USD. USD/PKR selection changes display conversion, not the stored transaction values.
- **Charity reserve** is separate from transactions and clients. Starting June 2026, each closed calendar month accrues 2% of positive net amount earned. Gross earned is completed payment gross by order date plus expense refunds by refund date. Net earned is gross earned minus platform fees on completed payments, payment refunds issued in that month, and recorded tax expenses dated in that month. A refund in a later month does not revise the original month's gross or allocation. Expense refunds increase gross earned; payment refunds reduce net earned in their refund month. Other ordinary business expenses are excluded. There is no separate tax field, so tax is deducted only when recorded as an expense in a category matching the standalone word `tax` or `taxes`. A month is eligible on the first day after it closes, using the `Asia/Karachi` timezone. A month with zero or negative net amount earns no allocation.
- **Charity payment** records a donation amount in USD, recipient, payment date, optional notes, and creation timestamp. Payments reduce the accumulated reserve; partial payments carry the unpaid remainder forward. The monthly ledger applies recorded payments to the oldest allocations first, so it can show each month as paid, partially paid, unpaid, or without an allocation. Payment history is stored under the `charity_payments` Redis key and does not change transaction, client, or dashboard revenue totals.

### Current calculations

- Dashboard income includes only payments whose status is `Completed`.
- Dashboard gross revenue is completed payment `amount` minus payment refunds, before platform fees. Dashboard platform fees are the recorded fees on completed payments. Dashboard net income is completed payment `netAmount` (falling back to `amount - fees`) minus payment refunds; profit is net income minus business expenses, net of expense refunds. The charity ledger uses a distinct reserve base: expense refunds add to gross earned in their refund month; payment refunds and recorded tax expenses reduce net earned in their own months; other business expenses are excluded.
- Dashboard expenses are expense amounts minus expense refunds. Profit is dashboard net minus dashboard expenses.
- Client order count, gross, and fees include all payments with a username so uncleared orders remain visible. Lifetime earned includes only `Completed` payments: each payment's net amount (falling back to gross amount less fees) minus refunds linked to that completed payment.
- Dashboard date filters use each transaction's own date: payment `orderDate`, expense `expenseDate`, or refund `refundDate`.

## Main user flows

- `/` — dashboard totals, date filters, recent transactions, notifications, and logout.
- `/transactions` — searchable, filterable, sortable, paginated transaction ledger with date filtering and desktop/mobile layouts.
- `/transactions/[id]` — transaction detail, linked original, and all refunds against that transaction.
- `/clients` and `/clients/[client]` — searchable client directory, lifetime summary, order table, and linked refund history.
- `/charity` — reserve balance and recorded payment history.
- `/charity/monthly-ledger` — monthly table with month, gross earned, fees, net earned, and 2% allocation. Each column has a click-to-open formula popover. Amount headings and values are centered; smaller viewports use compact month cards instead of a horizontally scrolling table. The page also summarizes total allocated, paid, and outstanding amounts.
- The monthly ledger page offers opt-in PWA push notifications for when the prior month is added. The daily `/api/cron` job checks the Asia/Karachi date on the first day of each month, writes one in-app notification per closed month, and sends a Web Push notification to subscribed devices. Push requires a persistent VAPID key pair (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and optional `VAPID_SUBJECT`) configured in both local and Vercel environments. The service worker is `public/sw.js`.
- `/add` and `/edit/[id]` — create and edit payment, expense, or refund records.
- `/login` — shared-password login.

## Architecture and conventions

- Next.js App Router source lives under `src/app`; reusable UI lives under `src/components`; shared transaction calculations and formatting live under `src/lib`.
- Most screens are client components and load data from the app's own `/api/*` route handlers.
- Upstash Redis is the persistence layer. `src/lib/redis.ts` reads and writes whole arrays under the `transactions`, `categories`, `notifications`, and `charity_payments` keys (plus a `settings` key helper). Updates use read/modify/write; there is no relational schema or migration system.
- Domain helpers worth reusing: `src/lib/transaction-utils.ts` for transaction labels, dates, client stats, and refund-picker search; `src/lib/summary.ts` for dashboard totals.
- The UI uses Tailwind CSS 4 and shadcn/ui components (New York style). `src/components/client-layout.tsx` provides the authenticated workspace shell, with the responsive sidebar in `src/components/app-sidebar.tsx` and page header in `src/components/app-header.tsx`. Login renders outside that shell.
- Shared tables use `src/components/data-table.tsx`, built on `@tanstack/react-table` and the shadcn table primitives in `src/components/ui/table.tsx`. Keep the existing mobile card layouts when changing data-heavy screens.
- The dashboard chart uses the shadcn chart wrapper in `src/components/ui/chart.tsx` and Recharts.
- Use the supplied AdminCN free template as the visual source of truth. Keep its Geist typography, neutral shadcn color tokens, 0.625rem radius scale, compact sidebar and breadcrumb header, card surfaces, buttons, data-table spacing, and chart palette. Shared primitives stay in `src/components/ui`; route pages should compose them instead of introducing a separate visual system.
- Keep positive and negative financial amounts readable through signs and labels. Use the template’s neutral status badge pattern for payment states; reserve color for chart series and existing semantic feedback states.
- Currency preference and exchange-rate state are managed in `src/components/currency-provider.tsx`. The exchange-rate route tries external USD-to-PKR providers and has a fallback rate.
- Client records and aggregate endpoints are intentionally not separate: clients are derived from `/api/transactions` at runtime.

## API routes

- `/api/transactions` — list, create, update, and delete transactions.
- `/api/categories` — list, create, and delete expense categories.
- `/api/notifications` — list and mark notifications read.
- `/api/charity` — list and record charity payments.
- `/api/charity/monthly-ledger` — return monthly charity allocations, payment application, statuses, and totals.
- `/api/push/public-key` — return the public VAPID key for the notification opt-in flow.
- `/api/push/subscriptions` — authenticated endpoints for storing or removing this app's Web Push subscriptions in Redis.
- `/api/auth` — check login, validate password, and clear the login cookie.
- `/api/exchange-rate` — obtain the current USD-to-PKR rate.
- `/api/cron` — advance due clearing payments and create notifications; configured as a daily Vercel cron in `vercel.json`.

## Deployment

- Production domain: https://mikdexfinance.vercel.app

## Local development

Use Node.js and npm from the project root:

```bash
npm install
npm run dev
```

Other package scripts:

```bash
npm run build
npm run lint
npm test
```

Environment variable names are documented in `.env.local.example`: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `APP_PASSWORD`. The example also lists `EXCHANGE_RATE`; check the code before assuming an environment value is consumed, since the current currency provider fetches a rate at runtime. Do not commit `.env.local` or copy its values into docs.

## Maintenance notes

- `README.md` is still the default create-next-app README; use this file and the source tree for project-specific orientation.
- The auth cookie is a single shared `auth=true` cookie, and the auth route falls back to `devpassword` when `APP_PASSWORD` is unset. The middleware matcher excludes `/api/*`, so API handlers do not automatically receive the page redirect check. Preserve this distinction when changing authentication or deployment settings.
- `/api/cron` checks a Bearer `CRON_SECRET` only when that environment variable is configured.
- `scripts/seed.ts` replaces the entire Redis `transactions` array. Treat it as destructive; review the script and target environment before running it. The other scripts under `scripts/` write directly to Redis as well.
- Refunds are supported as multiple linked records in the data model. The transaction detail view lists every refund linked to an original payment or expense.
- Existing automated tests are Node tests for transaction utilities and dashboard summary logic in `tests/`.

## Useful source files

- `src/lib/redis.ts` — persistence types, Redis keys, and data operations.
- `src/lib/summary.ts` — dashboard financial calculations.
- `src/lib/charity.ts` — monthly reserve calculation and charity payment types.
- `src/app/charity/monthly-ledger/monthly-ledger-page-client.tsx` — charity ledger table and summary.
- `src/lib/transaction-utils.ts` — transaction labels, search, and client aggregation.
- `src/app/api/transactions/route.ts` — transaction HTTP API.
- `src/components/currency-provider.tsx` — currency display and conversion state.
- `docs/plans/` — design notes for refunds, client detail pages, and refund-picker performance.

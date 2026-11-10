# Client Tracking, Detail Pages — Design

**Date:** 2026-09-26
**Status:** Approved

## Goal

Add client visibility to the Finance Tracker: a Client column, a Clients list page, a client detail page, and a transaction detail page — as the first step toward a future CRM.

## Data & API

**No schema or API changes.** Clients are derived at request time from the existing `/api/transactions` endpoint:

- A client = a distinct `username` value across payment transactions.
- A "new client" = any free-typed `username` saved on a payment.
- Empty `username` renders as `–` everywhere.

## Components & Pages

### 1. Add/Edit forms — client combobox
- Rename label "Username" → **"Client username"** (add + edit pages).
- Replace the plain text input with a shadcn **Combobox** (Popover + Command, `cmdk`): typing filters existing clients; selecting fills the field; free-typed values become new clients on save.
- Client list for suggestions fetched from `/api/transactions` (distinct payment usernames).

### 2. Transactions list (`/transactions`)
- Desktop table: new **Client** column immediately after **Name**; `username` or `–`.
- Mobile card: client as a muted line under the transaction name.
- Whole row/card links to `/transactions/[id]`; Edit/Delete buttons keep current behavior.

### 3. Clients list (`/clients`)
One row per client (desktop table / mobile cards), sorted by Earned desc:

| Client | Orders | Gross | Fees | Earned | Last order |

- **Earned** = Σ net of their payments − Σ refunds against those payments.
- Navbar gains a **Clients** link (desktop nav + mobile hamburger menu). Bottom nav unchanged (3 items).

### 4. Client detail (`/clients/[client]`)
- Header: large **Total earned** (after refunds) + secondary stats: orders, gross, fees, refunds.
- Table of their orders: Date, Order ID, Status, Gross, Fee, Net; refunds against their orders shown with negative amounts.
- Unknown client → "Client not found" empty state.
- Links from `/clients` rows and from client names in tables.

### 5. Transaction detail (`/transactions/[id]`)
- Full record rendered by type (payment / expense / refund): dates, status, source, client, amounts, description.
- Related-transaction links both ways (refund ↔ original).
- Edit + Delete actions reusing existing handlers/API.
- Single-column mobile-friendly layout.

## Approaches Considered

1. **Derive clients from existing transactions (chosen)** — zero backend changes, single source of truth.
2. Dedicated `/api/clients` aggregation route — rejected: redundant at current data size.
3. Separate Redis client entities — rejected: YAGNI; revisit when the CRM conversion actually starts.

## Testing & Delivery

- `npx tsc --noEmit`, `npm run build`
- Playwright at 375px and 1280px: all new pages, combobox create/select flows, row links
- Desktop regression check on `/` and `/transactions`
- Deploy `npx vercel --prod --yes` + production smoke test

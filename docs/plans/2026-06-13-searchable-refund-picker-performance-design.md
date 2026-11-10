# Searchable Refund Picker And Performance Design

## Goal

Make refund source selection safer when transaction names repeat, and improve the perceived speed of the dashboard, add/edit forms, and transaction listing page.

## Refund Picker

The refund source selector should use a modal instead of a cramped dropdown. The modal includes a search input and rows that show transaction name, date, amount, type/source/category, and description where available.

Search matches practical identifying fields: name, description, category, source, username, order ID, date, and amount. The user must explicitly choose the original transaction before saving a refund.

## Listing Performance

The listing page should avoid repeated work while rendering rows. It should build a transaction ID index once, derive filtered/sorted rows once, and reuse precomputed labels and dates for both mobile cards and desktop table rows.

## Broader Performance

The add form should only fetch the full transaction list when refund mode needs it. The edit form should fetch transactions once and reuse that data for both the edited transaction and refund picker. The dashboard should not wait for the cron endpoint before loading visible transaction and notification data.

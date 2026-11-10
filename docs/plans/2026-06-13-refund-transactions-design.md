# Refund Transactions Design

## Goal

Add refunds as first-class transactions. A refund can apply to either a payment or an expense, and it must reference the original transaction being refunded.

## Data Model

Transactions gain a third type: `refund`.

Refund transactions store:

- `refundFor`: `payment` or `expense`
- `refundedTransactionId`: ID of the original payment or expense
- `amount`: refund amount, allowing partial refunds
- `refundDate`: date the refund happened

Multiple refund transactions can reference the same original transaction, which supports phased or partial refunds.

## Dashboard Totals

Payment refunds reduce gross income, income, and profit.

Expense refunds reduce expenses and increase profit.

Refunds do not mutate original transactions, preserving an audit trail.

## Forms

The add/edit transaction form will offer `Payment`, `Expense`, and `Refund`.

For refunds, the user selects whether the refund applies to a payment or an expense, then selects the matching original transaction. The form stores the selected reference and refund amount.

## Transaction List

Refunds appear as their own rows/cards with labels that identify the original transaction where possible.

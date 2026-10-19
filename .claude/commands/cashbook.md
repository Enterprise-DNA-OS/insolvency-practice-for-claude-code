---
description: "The receipts and payments for one file, in date order."
---

# cashbook

The receipts and payments for one file, in date order.

Run `node scripts/cases.mjs cashbook --appointment=<ref>`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Total receipts, payments and dividends at the end. The balance is the cash held.

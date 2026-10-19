---
description: "Cash position of each open file: estimate, receipts, payments, dividends, cash held."
---

# position

Cash position of each open file: estimate, receipts, payments, dividends, cash held.

Run `node scripts/cases.mjs position [--appointment=<ref>]`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Order by cash held. Say which files hold cash with no dividend planned.

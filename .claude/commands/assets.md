---
description: "Assets on each open file: estimate, what was realised, what is still to realise, and any security interest."
---

# assets

Assets on each open file: estimate, what was realised, what is still to realise, and any security interest.

Run `node scripts/cases.mjs assets [--appointment=<ref>]`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Point out anything still to realise more than 90 days after appointment and anything sold well under the estimate.

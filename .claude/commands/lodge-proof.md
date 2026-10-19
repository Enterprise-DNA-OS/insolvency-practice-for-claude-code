---
description: "Record a proof of debt (NZ: a claim) lodged by a creditor, in its class."
---

# lodge-proof

Record a proof of debt (NZ: a claim) lodged by a creditor, in its class.

Run `node scripts/cases.mjs lodge-proof <ref> "<creditor>" --amount=<amount> --class=<employee_wages|employee_leave|employee_redundancy|tax_preferential|unsecured> [--date=<YYYY-MM-DD>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. tax_preferential is the NZ class for preferential Inland Revenue claims. An employee with wages and leave owing lodges two proofs, one per class.

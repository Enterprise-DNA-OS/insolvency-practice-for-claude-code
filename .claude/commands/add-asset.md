---
description: "Add an asset with its estimated value, and the secured creditor if one holds security over it."
---

# add-asset

Add an asset with its estimated value, and the secured creditor if one holds security over it.

Run `node scripts/cases.mjs add-asset <ref> --description="<asset>" --kind=<cash_at_bank|debtors|plant|stock|vehicle|property|recovery_claim|other> [--estimate=<amount>] [--secured="<creditor>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database.

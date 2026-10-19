---
description: "Add a creditor to a file, with what the company's records say is owed."
---

# add-creditor

Add a creditor to a file, with what the company's records say is owed.

Run `node scripts/cases.mjs add-creditor <ref> --name="<creditor>" --kind=<trade|employee|tax_authority|secured|related_party|other> [--owed=<amount>] [--contact=<email>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database.

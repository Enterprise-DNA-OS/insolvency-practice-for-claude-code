---
description: "Export every record to one JSON file the business owns."
---

# export

Export every record to one JSON file the business owns.

Run `node scripts/cases.mjs export --out=<file.json>`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Never overwrite an existing file. Say where it was written.

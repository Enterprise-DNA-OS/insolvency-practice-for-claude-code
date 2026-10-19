---
description: "Bring a Turnkey IPS creditor listing (saved as CSV) into a file. Dry run first."
---

# import

Bring a Turnkey IPS creditor listing (saved as CSV) into a file. Dry run first.

Run `node scripts/cases.mjs import ips <file.csv> --appointment=<ref> [--map=<column-map.json>] --actor="<name>" --dry-run`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Follow docs/replace-turnkey-ips.md. Run with --dry-run, show the counts, then run again without it once the operator agrees. A conflicting row stops the whole import.

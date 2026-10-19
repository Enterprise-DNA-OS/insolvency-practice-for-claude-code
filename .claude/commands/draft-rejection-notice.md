---
description: "Draft the notice to a creditor whose proof was rejected or part-admitted, with the reason recorded. Written to drafts/, never sent."
---

# draft-rejection-notice

Draft the notice to a creditor whose proof was rejected or part-admitted, with the reason recorded. Written to drafts/, never sent.

Run `node scripts/cases.mjs draft-rejection-notice <ref> "<creditor>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

The review period line is left for the practitioner to confirm.

---
description: "Proofs of debt (claims in NZ): lodged, admitted, part-admitted, rejected. Filter by file or status."
---

# proofs

Proofs of debt (claims in NZ): lodged, admitted, part-admitted, rejected. Filter by file or status.

Run `node scripts/cases.mjs proofs [--appointment=<ref>] [--status=lodged|admitted|partly_admitted|rejected|withdrawn]`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

For lodged proofs, say how long each has waited and whether a dividend notice is holding on it.

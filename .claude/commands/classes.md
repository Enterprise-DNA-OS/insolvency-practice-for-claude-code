---
description: "Admitted claims by class with dividends paid, in the order they rank."
---

# classes

Admitted claims by class with dividends paid, in the order they rank.

Run `node scripts/cases.mjs classes [--appointment=<ref>]`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

A class is paid only when every class above it is paid in full. Say what the next dividend could be.

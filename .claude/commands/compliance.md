---
description: "Check every open file against the rules in docs/compliance.md: overdue steps, short meeting notice, remuneration over approval, dividends paid out of order, proofs not dealt with in time, NZ licence numbers."
---

# compliance

Check every open file against the rules in docs/compliance.md: overdue steps, short meeting notice, remuneration over approval, dividends paid out of order, proofs not dealt with in time, NZ licence numbers.

Run `node scripts/cases.mjs compliance`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Report as a table: file, rule, finding, source. Breaches first. For each breach draft the fix the operator can approve (the step to record, the approval to seek, the notice to draft). Nothing here is legal advice: if a rule looks out of date, say so and stop; the operator confirms it, then update docs/compliance.md and supabase/migrations together.

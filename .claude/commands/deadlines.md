---
description: "The statutory calendar: every step due in the next 60 days (or `--days=N`), or every step on one file, with the rule each comes from."
---

# deadlines

The statutory calendar: every step due in the next 60 days (or `--days=N`), or every step on one file, with the rule each comes from.

Run `node scripts/cases.mjs deadlines [--appointment=<ref>] [--days=<n>]`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Show overdue first, then this week. Quote the source column when someone asks why a date is what it is. If a date looks wrong, check the holidays table and docs/compliance.md before changing anything.

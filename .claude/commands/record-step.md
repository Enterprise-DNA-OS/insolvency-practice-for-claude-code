---
description: "Record a statutory step as done: DIRRI, initial notice, report to creditors, annual return, NZ first or six-monthly report. The step name comes from the rules."
---

# record-step

Record a statutory step as done: DIRRI, initial notice, report to creditors, annual return, NZ first or six-monthly report. The step name comes from the rules.

Run `node scripts/cases.mjs record-step <ref> "<step>" [--date=<YYYY-MM-DD>] [--reference="<ASIC document number or note>"] [--period=<n>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Repeating steps (annual returns, six-monthly reports) take the earliest open period unless --period is given.

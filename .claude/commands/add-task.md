---
description: "Add a task to a file."
---

# add-task

Add a task to a file.

Run `node scripts/cases.mjs add-task <ref> --title="<task>" [--owner="<name>"] [--due=<YYYY-MM-DD>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database.

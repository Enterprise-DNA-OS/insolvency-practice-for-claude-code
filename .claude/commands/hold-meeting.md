---
description: "Record a meeting as held, with its outcome. A first, second or NZ creditors' meeting also records its statutory step."
---

# hold-meeting

Record a meeting as held, with its outcome. A first, second or NZ creditors' meeting also records its statutory step.

Run `node scripts/cases.mjs hold-meeting <ref> <first|second|creditors|committee|other> --outcome="<what was resolved>" [--date=<YYYY-MM-DD>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database.

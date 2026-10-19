---
description: "Record a meeting called. Refuses a meeting date that gives less notice than the rules require."
---

# call-meeting

Record a meeting called. Refuses a meeting date that gives less notice than the rules require.

Run `node scripts/cases.mjs call-meeting <ref> --kind=<first|second|creditors|committee|other> --meeting=<YYYY-MM-DD> [--date=<notice sent>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Draft the notice itself with the operator; nothing is sent from here.

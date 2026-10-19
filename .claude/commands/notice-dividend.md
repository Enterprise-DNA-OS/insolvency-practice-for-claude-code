---
description: "Record a notice of intention to declare a dividend for one class, with the last day for proofs. Refuses a last day earlier than the rules allow."
---

# notice-dividend

Record a notice of intention to declare a dividend for one class, with the last day for proofs. Refuses a last day earlier than the rules allow.

Run `node scripts/cases.mjs notice-dividend <ref> --class=<class> --close=<last day for proofs> [--date=<notice date>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Then offer /draft-dividend-notice.

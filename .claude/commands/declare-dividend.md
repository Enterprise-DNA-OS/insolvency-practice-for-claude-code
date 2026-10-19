---
description: "Declare and pay a dividend to one class, pro rata to what each admitted proof is still owed. Refuses before proofs close, with proofs undecided, with a higher class unpaid, or without the cash."
---

# declare-dividend

Declare and pay a dividend to one class, pro rata to what each admitted proof is still owed. Refuses before proofs close, with proofs undecided, with a higher class unpaid, or without the cash.

Run `node scripts/cases.mjs declare-dividend <ref> --class=<class> --amount=<pool> [--date=<YYYY-MM-DD>] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Run /classes first and show the schedule it would produce. The payments themselves are made from the bank by a person.

---
description: "Close a file. Refuses with cash held, assets not dealt with, proofs undecided, overdue steps, open tasks or remuneration over approval."
---

# close

Close a file. Refuses with cash held, assets not dealt with, proofs undecided, overdue steps, open tasks or remuneration over approval.

Run `node scripts/cases.mjs close <ref> --reference="<final return reference>" --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Run /history first and list what is left. AU: Form 5603 within 1 month after the administration ends. NZ: the final report under s 257.

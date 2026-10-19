---
description: "Admit, part-admit or reject the oldest proof waiting from a creditor. A part admission or rejection needs the reason."
---

# adjudicate

Admit, part-admit or reject the oldest proof waiting from a creditor. A part admission or rejection needs the reason.

Run `node scripts/cases.mjs adjudicate <ref> "<creditor>" --status=<admitted|partly_admitted|rejected> [--amount=<admitted amount>] [--reason="<reason>"] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Only pass --reason in the practitioner's own words. After a rejection or part admission, offer /draft-rejection-notice.

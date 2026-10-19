---
description: "Open a new file: company, jurisdiction (AU or NZ), kind (cvl, court, va), appointment date, practitioner and licence."
---

# add-appointment

Open a new file: company, jurisdiction (AU or NZ), kind (cvl, court, va), appointment date, practitioner and licence.

Run `node scripts/cases.mjs add-appointment --ref=<ref> --company="<name>" --number="<ACN or NZBN>" --jurisdiction=<AU|NZ> --kind=<cvl|court|va> --appointed=<YYYY-MM-DD> --practitioner="<name>" --licence="<number>" --manager="<name>" [--extended] --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. In NZ, cvl means appointed by shareholders or the board. Use --extended for an Australian administration whose convening period runs over December or Easter (25 business days). Run `deadlines --appointment=<ref>` straight after to show the calendar.

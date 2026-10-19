---
description: "Record a payment of costs from the file's account: legal, agent, trading or other. Refuses more than the cash held."
---

# pay

Record a payment of costs from the file's account: legal, agent, trading or other. Refuses more than the cash held.

Run `node scripts/cases.mjs pay <ref> --amount=<amount> --payee="<payee>" --description="<what>" --category=<legal|agent|trading|tax|other> --actor="<name>"`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Every write needs `--actor="<the operator's name>"`. Read the file with `history` first, then say back what will change before running it. Nothing here sends, pays or lodges anything outside this database. Remuneration goes through /draw-remuneration and dividends through /declare-dividend, never here.

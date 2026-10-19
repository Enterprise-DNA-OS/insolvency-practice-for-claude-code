# CLI reference

One CLI: `node scripts/cases.mjs <command> [arguments] [--key=value ...]`. Human tables by default; `--json` prints every field. Every write needs `--actor`. Dates are `YYYY-MM-DD`. Amounts accept `1234.56`, `1,234.56` or `$1,234.56`. Unknown options are rejected.

Files match by reference, company name, company number or id; creditors, assets, meetings and tasks match by name within the file. Exact matches win; a unique partial match works; anything else lists the candidates and exits 1.

## abandon

Record an asset abandoned or disclaimed, with the reason.

```bash
node scripts/cases.mjs abandon <ref> "<asset>" --reason="<reason>" --actor="<name>"
```

## add-appointment

Open a new file: company, jurisdiction (AU or NZ), kind (cvl, court, va), appointment date, practitioner and licence.

```bash
node scripts/cases.mjs add-appointment --ref=<ref> --company="<name>" --number="<ACN or NZBN>" --jurisdiction=<AU|NZ> --kind=<cvl|court|va> --appointed=<YYYY-MM-DD> --practitioner="<name>" --licence="<number>" --manager="<name>" [--extended] --actor="<name>"
```

## add-asset

Add an asset with its estimated value, and the secured creditor if one holds security over it.

```bash
node scripts/cases.mjs add-asset <ref> --description="<asset>" --kind=<cash_at_bank|debtors|plant|stock|vehicle|property|recovery_claim|other> [--estimate=<amount>] [--secured="<creditor>"] --actor="<name>"
```

## add-creditor

Add a creditor to a file, with what the company's records say is owed.

```bash
node scripts/cases.mjs add-creditor <ref> --name="<creditor>" --kind=<trade|employee|tax_authority|secured|related_party|other> [--owed=<amount>] [--contact=<email>] --actor="<name>"
```

## add-task

Add a task to a file.

```bash
node scripts/cases.mjs add-task <ref> --title="<task>" [--owner="<name>"] [--due=<YYYY-MM-DD>] --actor="<name>"
```

## adjudicate

Admit, part-admit or reject the oldest proof waiting from a creditor. A part admission or rejection needs the reason.

```bash
node scripts/cases.mjs adjudicate <ref> "<creditor>" --status=<admitted|partly_admitted|rejected> [--amount=<admitted amount>] [--reason="<reason>"] --actor="<name>"
```

## appointments

List every file: company, kind of appointment, manager, cash held, assets still to realise, proofs open and statutory steps due.

```bash
node scripts/cases.mjs appointments
```

## approve-remuneration

Record remuneration approved by creditors, the committee or the court (NZ: the fee basis creditors were told).

```bash
node scripts/cases.mjs approve-remuneration <ref> --amount=<amount> --by=<creditors|committee|court> [--period="<period>"] [--date=<YYYY-MM-DD>] --actor="<name>"
```

## assets

Assets on each open file: estimate, what was realised, what is still to realise, and any security interest.

```bash
node scripts/cases.mjs assets [--appointment=<ref>]
```

## attention

Show what needs a person this week: overdue statutory steps, steps due this week, meetings coming up, proofs waiting on adjudication, overdue tasks, assets not realised, remuneration over approval and quiet files.

```bash
node scripts/cases.mjs attention
```

## call-meeting

Record a meeting called. Refuses a meeting date that gives less notice than the rules require.

```bash
node scripts/cases.mjs call-meeting <ref> --kind=<first|second|creditors|committee|other> --meeting=<YYYY-MM-DD> [--date=<notice sent>] --actor="<name>"
```

## cashbook

The receipts and payments for one file, in date order.

```bash
node scripts/cases.mjs cashbook --appointment=<ref>
```

## classes

Admitted claims by class with dividends paid, in the order they rank.

```bash
node scripts/cases.mjs classes [--appointment=<ref>]
```

## close

Close a file. Refuses with cash held, assets not dealt with, proofs undecided, overdue steps, open tasks or remuneration over approval.

```bash
node scripts/cases.mjs close <ref> --reference="<final return reference>" --actor="<name>"
```

## compliance

Check every open file against the rules in docs/compliance.md: overdue steps, short meeting notice, remuneration over approval, dividends paid out of order, proofs not dealt with in time, NZ licence numbers.

```bash
node scripts/cases.mjs compliance
```

## creditors

One file's creditors: kind, what the company's records said, what each claimed and was admitted, and dividends paid.

```bash
node scripts/cases.mjs creditors --appointment=<ref>
```

## deadlines

The statutory calendar: every step due in the next 60 days (or `--days=N`), or every step on one file, with the rule each comes from.

```bash
node scripts/cases.mjs deadlines [--appointment=<ref>] [--days=<n>]
```

## declare-dividend

Declare and pay a dividend to one class, pro rata to what each admitted proof is still owed. Refuses before proofs close, with proofs undecided, with a higher class unpaid, or without the cash.

```bash
node scripts/cases.mjs declare-dividend <ref> --class=<class> --amount=<pool> [--date=<YYYY-MM-DD>] --actor="<name>"
```

## done

Mark an open task done.

```bash
node scripts/cases.mjs done <ref> "<task>" --actor="<name>"
```

## draft-creditor-update

Draft an update to creditors on one file: realisations, claims by class, the next statutory steps. Written to drafts/, never sent.

```bash
node scripts/cases.mjs draft-creditor-update <ref>
```

## draft-dividend-notice

Draft the notice of intention to declare a dividend for one class. Written to drafts/, never sent.

```bash
node scripts/cases.mjs draft-dividend-notice <ref> --class=<class>
```

## draft-rejection-notice

Draft the notice to a creditor whose proof was rejected or part-admitted, with the reason recorded. Written to drafts/, never sent.

```bash
node scripts/cases.mjs draft-rejection-notice <ref> "<creditor>"
```

## draw-remuneration

Draw remuneration from the file's account. Refuses more than is approved and undrawn (in NZ, unless a reason is recorded).

```bash
node scripts/cases.mjs draw-remuneration <ref> --amount=<amount> [--reason="<reason>"] --actor="<name>"
```

## export

Export every record to one JSON file the business owns.

```bash
node scripts/cases.mjs export --out=<file.json>
```

## history

Everything about one file: position, remuneration, statutory steps, claims by class, assets, meetings and recent activity.

```bash
node scripts/cases.mjs history <ref or company>
```

## hold-meeting

Record a meeting as held, with its outcome. A first, second or NZ creditors' meeting also records its statutory step.

```bash
node scripts/cases.mjs hold-meeting <ref> <first|second|creditors|committee|other> --outcome="<what was resolved>" [--date=<YYYY-MM-DD>] --actor="<name>"
```

## import

Bring a Turnkey IPS creditor listing (saved as CSV) into a file. Dry run first.

```bash
node scripts/cases.mjs import ips <file.csv> --appointment=<ref> [--map=<column-map.json>] --actor="<name>" --dry-run
```

## insights

The ten questions Turnkey IPS does not answer: cents in the dollar today, proofs above the records, assets sold under estimate, related-party vote share, adjudication speed, where staff time goes, time above approval, cash held longest, creditors across files.

```bash
node scripts/cases.mjs insights
```

## lodge-proof

Record a proof of debt (NZ: a claim) lodged by a creditor, in its class.

```bash
node scripts/cases.mjs lodge-proof <ref> "<creditor>" --amount=<amount> --class=<employee_wages|employee_leave|employee_redundancy|tax_preferential|unsecured> [--date=<YYYY-MM-DD>] --actor="<name>"
```

## log-time

Record time worked on a file, by task, at the staff member's rate.

```bash
node scripts/cases.mjs log-time <ref> --staff="<name>" --hours=<hours> --rate=<hourly rate> --task=<assets|creditors|employees|investigation|dividend|administration|trade_on> [--description="<what>"] --actor="<name>"
```

## log

Add a note to a file's history: a call, a meeting with the director, advice received.

```bash
node scripts/cases.mjs log <ref> --note="<what happened>" --actor="<name>"
```

## meetings

Meetings called and held, with notice dates and outcomes.

```bash
node scripts/cases.mjs meetings [--appointment=<ref>]
```

## notice-dividend

Record a notice of intention to declare a dividend for one class, with the last day for proofs. Refuses a last day earlier than the rules allow.

```bash
node scripts/cases.mjs notice-dividend <ref> --class=<class> --close=<last day for proofs> [--date=<notice date>] --actor="<name>"
```

## pay

Record a payment of costs from the file's account: legal, agent, trading or other. Refuses more than the cash held.

```bash
node scripts/cases.mjs pay <ref> --amount=<amount> --payee="<payee>" --description="<what>" --category=<legal|agent|trading|tax|other> --actor="<name>"
```

## position

Cash position of each open file: estimate, receipts, payments, dividends, cash held.

```bash
node scripts/cases.mjs position [--appointment=<ref>]
```

## proofs

Proofs of debt (claims in NZ): lodged, admitted, part-admitted, rejected. Filter by file or status.

```bash
node scripts/cases.mjs proofs [--appointment=<ref>] [--status=lodged|admitted|partly_admitted|rejected|withdrawn]
```

## realise

Record an asset sold or collected. The money goes into the cashbook as a receipt.

```bash
node scripts/cases.mjs realise <ref> "<asset>" --amount=<amount> [--date=<YYYY-MM-DD>] --actor="<name>"
```

## receipt

Record money in that is not an asset sale: trading receipts, interest, a refund.

```bash
node scripts/cases.mjs receipt <ref> --amount=<amount> --description="<what>" [--category=trading|tax|other] [--from="<payer>"] --actor="<name>"
```

## record-step

Record a statutory step as done: DIRRI, initial notice, report to creditors, annual return, NZ first or six-monthly report. The step name comes from the rules.

```bash
node scripts/cases.mjs record-step <ref> "<step>" [--date=<YYYY-MM-DD>] [--reference="<ASIC document number or note>"] [--period=<n>] --actor="<name>"
```

## remuneration

Remuneration approved, drawn and recorded as time on each file.

```bash
node scripts/cases.mjs remuneration [--appointment=<ref>]
```

## tasks

Open tasks, oldest due first.

```bash
node scripts/cases.mjs tasks [--appointment=<ref>]
```

## weekly-review

Write the Monday review from attention, the next 14 days of statutory steps and money held.

```bash
node scripts/cases.mjs weekly-review
```

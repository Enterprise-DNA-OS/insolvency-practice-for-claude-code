# Insolvency Practice for Claude Code: operating instructions

Claude Code reads this file at the start of every session. It says who this is for, the house rules, and the one right way to do each recurring job.

## Who this is for

- **Practice:** [YOUR FIRM]
- **Operator:** [YOUR NAME], [your role]
- **What matters most:** [for example: no statutory step missed, and no remuneration drawn without approval]

The work is corporate insolvency for an accounting or restructuring practice in Australia or New Zealand: creditors' voluntary and court liquidations and voluntary administrations, from appointment to the final return.

## Rules

- Read the CLI result before answering. Every answer about a file starts with data from `node scripts/cases.mjs`. Never answer from memory.
- Resolve names first. If the CLI says a name is ambiguous, list the candidates and ask; never pick the first.
- Every write names `--actor`. That is a label in the activity log, not a verified identity or a signature.
- Never invent a value, date, claim, reason or outcome. Unknown values stay unknown.
- Never write an adjudication reason, a remuneration reason or a meeting outcome for the operator. They are the practitioner's words.
- Never send, lodge, pay or delete. Notices, updates and reviews are drafts in `drafts/`. Recording a payment or a dividend does not move money, and recording a step does not lodge anything with ASIC or the Registrar; a person does that outside this system.
- The rules in `docs/compliance.md` are records checks, not legal advice. Business and working days skip only the holidays in the `holidays` table: load your state's public holidays each year. If a rule looks out of date, say so and stop.
- Back up before a schema change. Use a new numbered migration (`/customise`), run `npm test`, and keep real data, exports and credentials out of Git.
- The database owner can bypass every application check. Protect that credential. Row security and revoked public privileges restrict unrelated database roles; a shared installation needs authenticated access.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| Record an asset abandoned or disclaimed, with the reason. | `/abandon` |
| Open a new file: company, jurisdiction (AU or NZ), kind (cvl, court, va), appointment date, practitioner and licence. | `/add-appointment` |
| Add an asset with its estimated value, and the secured creditor if one holds security over it. | `/add-asset` |
| Add a creditor to a file, with what the company's records say is owed. | `/add-creditor` |
| Add a task to a file. | `/add-task` |
| Admit, part-admit or reject the oldest proof waiting from a creditor. A part admission or rejection needs the reason. | `/adjudicate` |
| List every file: company, kind of appointment, manager, cash held, assets still to realise, proofs open and statutory steps due. | `/appointments` |
| Record remuneration approved by creditors, the committee or the court (NZ: the fee basis creditors were told). | `/approve-remuneration` |
| Assets on each open file: estimate, what was realised, what is still to realise, and any security interest. | `/assets` |
| Show what needs a person this week: overdue statutory steps, steps due this week, meetings coming up, proofs waiting on adjudication, overdue tasks, assets not realised, remuneration over approval and quiet files. | `/attention` |
| Record a meeting called. Refuses a meeting date that gives less notice than the rules require. | `/call-meeting` |
| The receipts and payments for one file, in date order. | `/cashbook` |
| Admitted claims by class with dividends paid, in the order they rank. | `/classes` |
| Close a file. Refuses with cash held, assets not dealt with, proofs undecided, overdue steps, open tasks or remuneration over approval. | `/close` |
| Check every open file against the rules in docs/compliance.md: overdue steps, short meeting notice, remuneration over approval, dividends paid out of order, proofs not dealt with in time, NZ licence numbers. | `/compliance` |
| One file's creditors: kind, what the company's records said, what each claimed and was admitted, and dividends paid. | `/creditors` |
| Make this system yours in plain language. Add a field, rename stages, change a rule, add a column to a document. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| The statutory calendar: every step due in the next 60 days (or `--days=N`), or every step on one file, with the rule each comes from. | `/deadlines` |
| Declare and pay a dividend to one class, pro rata to what each admitted proof is still owed. Refuses before proofs close, with proofs undecided, with a higher class unpaid, or without the cash. | `/declare-dividend` |
| Render the summary of receipts and payments, dividend schedules and the schedule of creditors and proofs as branded HTML from the records. | `/documents` |
| Mark an open task done. | `/done` |
| Draft an update to creditors on one file: realisations, claims by class, the next statutory steps. Written to drafts/, never sent. | `/draft-creditor-update` |
| Draft the notice of intention to declare a dividend for one class. Written to drafts/, never sent. | `/draft-dividend-notice` |
| Draft the notice to a creditor whose proof was rejected or part-admitted, with the reason recorded. Written to drafts/, never sent. | `/draft-rejection-notice` |
| Draw remuneration from the file's account. Refuses more than is approved and undrawn (in NZ, unless a reason is recorded). | `/draw-remuneration` |
| Export every record to one JSON file the business owns. | `/export` |
| Everything about one file: position, remuneration, statutory steps, claims by class, assets, meetings and recent activity. | `/history` |
| Record a meeting as held, with its outcome. A first, second or NZ creditors' meeting also records its statutory step. | `/hold-meeting` |
| Bring a Turnkey IPS creditor listing (saved as CSV) into a file. Dry run first. | `/import` |
| The ten questions Turnkey IPS does not answer: cents in the dollar today, proofs above the records, assets sold under estimate, related-party vote share, adjudication speed, where staff time goes, time above approval, cash held longest, creditors across files. | `/insights` |
| Record a proof of debt (NZ: a claim) lodged by a creditor, in its class. | `/lodge-proof` |
| Record time worked on a file, by task, at the staff member's rate. | `/log-time` |
| Add a note to a file's history: a call, a meeting with the director, advice received. | `/log` |
| Meetings called and held, with notice dates and outcomes. | `/meetings` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by `npm run view`. | `/new-view` |
| Record a notice of intention to declare a dividend for one class, with the last day for proofs. Refuses a last day earlier than the rules allow. | `/notice-dividend` |
| Record a payment of costs from the file's account: legal, agent, trading or other. Refuses more than the cash held. | `/pay` |
| Cash position of each open file: estimate, receipts, payments, dividends, cash held. | `/position` |
| Proofs of debt (claims in NZ): lodged, admitted, part-admitted, rejected. Filter by file or status. | `/proofs` |
| Record an asset sold or collected. The money goes into the cashbook as a receipt. | `/realise` |
| Record money in that is not an asset sale: trading receipts, interest, a refund. | `/receipt` |
| Record a statutory step as done: DIRRI, initial notice, report to creditors, annual return, NZ first or six-monthly report. The step name comes from the rules. | `/record-step` |
| Remuneration approved, drawn and recorded as time on each file. | `/remuneration` |
| Open tasks, oldest due first. | `/tasks` |
| Render the read-only dashboards in views.json (this week, statutory calendar, money and claims) as HTML in your brand. | `/view` |
| Write the Monday review from attention, the next 14 days of statutory steps and money held. | `/weekly-review` |
If an ask fits nothing here, run `node scripts/cases.mjs --help`, answer from the records, then propose a new command for it.

## Where things live

- `scripts/cases.mjs` is the one CLI. `scripts/lib/domain.mjs` holds its rules.
- `supabase/migrations/` is the schema in plain SQL. `0002_rules.sql` holds the statutory deadlines and notice periods, one row each with its source. `npm run migrate` applies it. `DATABASE_URL` chooses Postgres; unset, it uses PGlite in `.data/`.
- `views.json` and `documents.json` define the dashboards and documents. `brand.json` is your name, colours and logo.
- `docs/compliance.md` lists the rules and their sources. `docs/replace-turnkey-ips.md` is the switching guide.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=turnkey-ips&utm_medium=readme

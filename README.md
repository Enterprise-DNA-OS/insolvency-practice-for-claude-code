<h1 align="center">Insolvency Practice for Claude Code</h1>

<p align="center">
  <strong>The open-source insolvency case system that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your Turnkey IPS data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=turnkey-ips">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/turnkey-ips?utm_source=github&utm_medium=readme&utm_campaign=turnkey-ips">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#bring-your-turnkey-ips-files">Instead of Turnkey IPS</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Insolvency Practice for Claude Code does the job you pay Turnkey IPS for, as a Postgres database and a set of agent commands. There is no web front end. You open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask for what you want in plain language. It runs the right query, and it can answer questions the Turnkey IPS dashboard cannot.

Turnkey publishes no price for IPS: it is sold as a subscription after a demo, with paid add-ons (KYC checks, Confirmation of Payee, Turnkey Pay, Experian creditor reports) and separate products for the creditor portal and for proofs and proxies ([turnkey-ips.com](https://turnkey-ips.com/), checked 19 October 2026). Here the database is yours and there is no per-seat fee.

Want the same thing with a web front end, or built on a different stack? That is a customisation, and it is exactly what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=turnkey-ips).

It covers corporate insolvency for an accounting or restructuring practice in Australia or New Zealand: creditors' voluntary and court liquidations and voluntary administrations, from appointment to the final return. Every file gets a statutory calendar built from rules with their sources (DIRRI, initial notices, the report to creditors, annual returns, NZ first and six-monthly reports, first and second meetings), counted in business or working days. Proofs are admitted or rejected with reasons, dividends are paid class by class to the cent, and remuneration is drawn only against an approval.

## Why no front end

- The front end was only ever there because the database was hard to talk to. That is no longer true.
- Your data sits in plain Postgres tables you own. Any tool can read them. No export, no lock-in.
- No seats, no tiers, no add-ons. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for the honest trade-offs too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/insolvency-practice-for-claude-code.git
cd insolvency-practice-for-claude-code
npm install
npm run demo
```

Then open the folder in Claude Code and type `/attention`. Try `/deadlines`, `/classes` and `/compliance` next.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared data, no per-seat fee.

## The commands

| Command | What it does |
|---|---|
| `/attention` | Overdue statutory steps, steps due this week, meetings coming up, proofs waiting on adjudication, overdue tasks, assets not realised after 90 days, remuneration over approval, quiet files |
| `/deadlines` | The statutory calendar for every open file (next 60 days) or every step on one file, with the rule each comes from |
| `/classes` | Admitted claims by class with dividends paid so far, in the order they rank |
| `/remuneration` | Approved, drawn and time recorded on each file |
| `/compliance` | Breaches and what is due against the rules in [docs/compliance.md](docs/compliance.md), with sources |
| `/weekly-review` | The Monday review, written to `drafts/` from attention, the next 14 days of steps and money held |
| `/draft-creditor-update` | An update to creditors from the cashbook, the claims and the next statutory steps |
| `/draft-dividend-notice` | The notice of intention to declare a dividend, with the last day for proofs |
| `/draft-rejection-notice` | The notice to a creditor whose proof was rejected or part-admitted, with the recorded reason |

The working commands: `/add-appointment`, `/add-creditor`, `/lodge-proof`, `/adjudicate`, `/add-asset`, `/realise`, `/abandon`, `/receipt`, `/pay`, `/approve-remuneration`, `/log-time`, `/draw-remuneration`, `/record-step`, `/call-meeting`, `/hold-meeting`, `/notice-dividend`, `/declare-dividend`, `/add-task`, `/done`, `/log`, `/close`. The reads: `/appointments`, `/history`, `/creditors`, `/proofs`, `/assets`, `/cashbook`, `/position`, `/meetings`, `/tasks`, `/insights`. Plus `/import`, `/export`, `/view`, `/documents`, `/new-view` and `/customise`. 46 commands in all; [docs/cli.md](docs/cli.md) lists every option.

Names match case-insensitively. A partial name or reference works when it is unique; when it is not, the command lists the candidates and stops.

## The gates

- `/declare-dividend` refuses before the last day for proofs, while any proof in the class is undecided, while a higher class is not paid in full, without the cash, or for more than the class is owed. It splits the pool pro rata to what each admitted proof is still owed, to the cent.
- `/notice-dividend` refuses a last day for proofs earlier than the rules allow (21 days in Australia).
- `/call-meeting` refuses a meeting date with shorter notice than the rules require.
- `/draw-remuneration` refuses more than is approved and undrawn. In New Zealand, where a liquidator charges reasonable remuneration open to court review, drawing above the recorded fee basis needs a reason, and `/compliance` notes it.
- `/adjudicate` needs the reason for a part admission or a rejection. `/close` refuses with cash held, assets not dealt with, proofs undecided, overdue steps, open tasks or remuneration over approval.

The software records and checks; the practitioner decides. It is not legal advice, it does not move money, and it lodges nothing with ASIC or the Registrar.

## Bring your Turnkey IPS files

Run the creditor listing for a case, export it to Excel, save the sheet as CSV, and import it into the matching file, dry run first:

```bash
node scripts/cases.mjs import ips examples/ips-creditor-listing.csv --appointment=VA-002 --actor="Your name" --dry-run
```

The [switching guide](docs/replace-turnkey-ips.md) covers headings, what maps and what does not come across. Imports are atomic: identical creditors are skipped, a conflicting row stops the whole file, and every source column is kept with the creditor.

## Ten questions answered from your records

`/insights` runs all ten today, across every file at once.

1. Which statutory steps fall due in the next 30 days, by manager?
2. If every class were paid from the cash held today, how many cents in the dollar would each class get?
3. Which proofs claim much more than the company's own records show?
4. Which assets sold for less than the directors' estimate, and by how much?
5. Which related parties have lodged proofs, and how much of the vote do they hold?
6. How long does each manager take to admit or reject a proof?
7. Where is staff time going across open files, by task?
8. Which files have recorded more time than the remuneration approved?
9. Which open files have held cash longest without a dividend?
10. Which suppliers and lenders are creditors in more than one of our files?

## Your first hour: ten things to ask for

1. What needs my attention this week?
2. What statutory steps are due in the next fortnight, and who owns each?
3. Record that the Harbourline report to creditors went out today, with its ASIC reference.
4. What would unsecured creditors get in Harbourline if we paid a dividend today?
5. Reject the Pacific Timber proof for the amount above the ledger, and draft the notice.
6. Is any file drawing remuneration it has not had approved?
7. Show the Ridgeview cashbook.
8. Put our firm's name and logo on the receipts and payments.
9. Load this year's Queensland public holidays.
10. Add a field for the ASIC document number on every step through /customise.

## Verification

`npm test` runs 211 checks on a temporary database: migrations, repeatable seed data, business and working days (the NZ summer period and the New Year rule), every deadline rule, every read and write, proof adjudication, dividend order and the pro rata split to the cent, remuneration gates in both countries, meeting notice periods, closing a file, import repeats and rollback, drafts, export, the append-only activity log, read-only views, row security for unrelated database roles, and escaped HTML. Set `TEST_DATABASE_URL` to run the same checks on an empty Postgres database.

Read the [operating rules](CLAUDE.md), the [rules and sources](docs/compliance.md), the [selection evidence](docs/research.md) and [why there is no front end](docs/why-no-front-end.md).

## Architecture

```
insolvency-practice-for-claude-code/
  CLAUDE.md                 how the operator wants this run (routing table + house rules)
  AGENTS.md                 the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/         the slash commands
  scripts/                  the CLI the commands drive
  scripts/lib/db.mjs        one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/      plain SQL schema
  supabase/seed.sql         demo data
  docs/                     the thesis and the migration guide
```

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, a small CLI, a slash command per recurring job, no front end.

## Want it installed and run for you?

Enterprise DNA installs Insolvency Practice for Claude Code for your business, migrates your Turnkey IPS data, connects it to the rest of your tools, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=turnkey-ips)
- Read more: [enterprisedna.co/omni/instead-of/turnkey-ips](https://enterprisedna.co/omni/instead-of/turnkey-ips?utm_source=github&utm_medium=readme&utm_campaign=turnkey-ips)

## License

MIT. Copyright (c) 2026 Enterprise DNA.

#!/usr/bin/env node
// The one CLI for the insolvency desk. Human tables by default, --json for machines.
//   node scripts/cases.mjs --help
import { getDb } from './lib/db.mjs';
import { run, commands } from './lib/domain.mjs';
import { table, money } from './lib/format.mjs';

const args = [];
const flags = {};
for (const a of process.argv.slice(2)) {
  if (!a.startsWith('--')) { args.push(a); continue; }
  const i = a.indexOf('=');
  const key = a.slice(2, i < 0 ? undefined : i);
  if (Object.hasOwn(flags, key)) { console.error(`Duplicate --${key}`); process.exit(1); }
  flags[key] = i < 0 ? true : a.slice(i + 1);
}
const command = args.shift();

const ALLOWED = ['json', 'help', 'actor', 'appointment', 'ref', 'company', 'number', 'jurisdiction', 'kind', 'appointed', 'practitioner', 'licence',
  'manager', 'extended', 'currency', 'name', 'contact', 'owed', 'related', 'amount', 'class', 'date', 'status', 'reason', 'description', 'estimate',
  'secured', 'note', 'category', 'from', 'payee', 'by', 'period', 'staff', 'hours', 'minutes', 'rate', 'task', 'reference', 'meeting', 'outcome',
  'close', 'title', 'owner', 'due', 'days', 'map', 'dry-run', 'out'];

// *_cents columns print as money in the row's currency; everything else as written.
function cell(v, key, row) {
  if (v === null || v === undefined) return key.endsWith('_cents') ? 'unknown' : '';
  if (key.endsWith('_cents')) return money(v, row.currency);
  if (typeof v === 'boolean') return v ? 'yes' : 'no';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
function human(value) {
  if (Array.isArray(value)) {
    if (!value.length) return '  (none)';
    if (value[0]?.question) return value.map((x, i) => `${i + 1}. ${x.question}\n${human(x.rows)}`).join('\n\n');
    const keys = Object.keys(value[0]).filter((k) => k !== 'currency' || !value.some((r) => Object.keys(r).some((x) => x.endsWith('_cents'))));
    return table(value, keys.map((key) => ({ key, label: key.replace(/_cents$/, ''), align: key.endsWith('_cents') ? 'right' : 'left', width: 60, format: (v, row) => cell(v, key, row) })));
  }
  if (value && typeof value === 'object' && value.appointment && value.activity) {
    const a = value.appointment;
    const p = value.position;
    const r = value.remuneration;
    const withCur = (rows) => rows.map((x) => ({ ...x, currency: a.currency }));
    return [`${a.ref}  ${a.company_name}${a.company_number ? ` (${a.company_number})` : ''}  ${a.jurisdiction}, ${a.kind.replace(/_/g, ' ')}, ${a.status}`,
      `Appointed ${a.appointed_on}: ${a.practitioner}${a.practitioner_licence ? ` (${a.practitioner_licence})` : ''}. Manager ${a.manager}.`,
      `Received ${money(p.receipts_cents, a.currency)}, costs ${money(p.payments_cents, a.currency)}, dividends ${money(p.dividends_cents, a.currency)}, held ${money(p.cash_held_cents, a.currency)}.`,
      `Remuneration approved ${money(r.approved_cents, a.currency)}, drawn ${money(r.drawn_cents, a.currency)}, time recorded ${money(r.time_cost_cents, a.currency)}.`,
      '', 'Statutory steps', human(value.deadlines), '', 'Claims by class', human(withCur(value.classes)), '', 'Assets', human(withCur(value.assets)),
      '', 'Meetings', human(value.meetings),
      '', 'Recent activity', human(value.activity.map((x) => ({ ...x, at: new Date(x.at).toISOString().slice(0, 16).replace('T', ' ') })))].join('\n');
  }
  return Object.entries(value || {}).map(([k, v]) => `  ${k}: ${cell(v, k, value)}`).join('\n');
}

if (!command || flags.help) {
  console.log(`Insolvency desk. Commands: ${commands.join(', ')}.
Options use --key=value. Every write needs --actor="<your name>". See docs/cli.md.`);
} else {
  let db;
  try {
    for (const key of Object.keys(flags)) if (!ALLOWED.includes(key)) throw Error(`Unknown option --${key}`);
    db = await getDb();
    const result = await run(db, command, args, flags);
    console.log(flags.json ? JSON.stringify(result, null, 2) : human(result));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db?.close();
  }
}

#!/usr/bin/env node
// npm test: a temporary database, the demo files, every command exercised, then cleaned up.
// Set TEST_DATABASE_URL to run the same checks against an empty Postgres database instead of PGlite.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { run, reads, commands, insights, today, date, cents } from './lib/domain.mjs';
import { parseCsv } from './lib/csv.mjs';

const root = mkdtempSync(path.join(os.tmpdir(), 'cases-test-'));
process.env.DATA_DIR = path.join(root, 'db');
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.OUTPUT_DIR = path.join(root, 'out');

let db;
let checks = 0;
const ok = (v, msg) => { assert.ok(v, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const fails = async (fn, re) => { await assert.rejects(fn, re); checks++; };
const call = (cmd, args = [], f = {}) => run(db, cmd, args, f);
const shift = (n) => new Date(Date.parse(today()) + n * 86400000).toISOString().slice(0, 10);
const wd = async (start, n, juris) => (await db.query('select add_working_days($1::date, $2, $3) as d', [start, n, juris]))[0].d;
const A = { actor: 'Test' };

try {
  db = await getDb();
  await migrate(db);
  eq((await migrate(db)).ran.length, 0, 'migrate twice is a no-op');
  await seed(db);
  await seed(db);
  eq((await call('appointments')).length, 5, 'seed is idempotent');
  eq((await db.query('select count(*)::int as n from activity')).at(0).n, 11, 'seed activity written once');

  // Every read runs and returns rows.
  for (const cmd of Object.keys(reads)) {
    const f = ['creditors', 'cashbook'].includes(cmd) ? { appointment: 'CVL-001' } : {};
    ok(Array.isArray(await call(cmd, [], f)), `read ${cmd}`);
  }

  // Business and working days.
  eq(await wd('2026-12-23', 2, 'NZ'), '2027-01-05', 'NZ: 25 Dec to 2 Jan skipped, and Monday 4 Jan after a Friday New Year');
  eq(await wd('2026-12-23', 2, 'AU'), '2026-12-25', 'AU: only listed holidays are skipped');
  await db.query(`insert into holidays (day, jurisdiction, name) values ('2026-12-25','AU','Christmas Day')`);
  eq(await wd('2026-12-23', 2, 'AU'), '2026-12-28', 'a listed holiday is skipped');
  eq(await wd('2026-10-16', 0, 'AU'), '2026-10-16', 'zero days is the same day');

  // The demo data says what it should.
  const steps = await call('deadlines', [], { appointment: 'CVL-001' });
  eq(steps.find((r) => r.step.startsWith('Report to creditors')).state, 'overdue', 'report to creditors 3 months after appointment');
  eq(steps.find((r) => r.step.startsWith('Independence')).state, 'done', 'DIRRI done in time');
  eq((await call('deadlines', [], { appointment: 'CVL-005' })).find((r) => r.step.startsWith('Report to creditors')).state, 'done late');
  eq((await call('deadlines', [], { appointment: 'LIQ-004' })).find((r) => r.step.startsWith('Six-monthly')).state, 'upcoming');
  const attention = await call('attention');
  for (const [ref, item] of [['CVL-001', 'statutory step overdue'], ['VA-002', 'meeting coming up'], ['CVL-001', 'proof waiting on adjudication'],
    ['LIQ-004', 'quiet file'], ['CVL-005', 'remuneration over approval'], ['CVL-001', 'asset not realised'], ['CVL-001', 'task overdue']]) {
    ok(attention.some((r) => r.ref === ref && r.item === item), `${ref}: ${item}`);
  }
  eq(attention[0].item, 'statutory step overdue', 'overdue statutory steps lead');
  const [p1] = await call('position', [], { appointment: 'CVL-001' });
  eq(Number(p1.cash_held_cents), 4760000, 'cash held = receipts - payments - dividends');
  const comp = await call('compliance');
  ok(comp.some((r) => r.ref === 'CVL-005' && r.rule === 'remuneration drawn' && r.severity === 'breach'), 'AU remuneration over approval is a breach');
  ok(comp.some((r) => r.ref === 'CVL-005' && r.rule === 'order of payment' && r.finding.includes('employee_leave')), 'unsecured paid before leave caught');
  ok(comp.some((r) => r.ref === 'LIQ-003' && r.rule === 'licensed practitioner'), 'NZ licence missing');
  ok(comp.some((r) => r.ref === 'CVL-001' && r.rule === 'proof adjudication' && r.source.includes('5.6.66')), 'proof to deal with after proofs closed');
  ok(comp.some((r) => r.ref === 'CVL-005' && r.severity === 'note' && r.finding.includes('after the due date')), 'late step noted');
  eq(comp[0].severity, 'breach', 'breaches first');
  const qs = await call('insights');
  eq(qs.length, 10, 'ten questions');
  eq(insights.length, 10);
  eq(Number(qs[1].rows.find((r) => r.ref === 'CVL-001' && r.class === 'unsecured').cents_in_dollar), 24.59, 'leave paid first, then unsecured pro rata');
  eq(qs[2].rows[0].creditor, 'Pacific Timber Supplies Ltd', 'proof well above the records');
  ok(qs[9].rows.some((r) => r.creditor === 'Pacific Timber Supplies Ltd' && r.files === 2), 'same supplier in two files');
  ok(qs[9].rows.every((r) => !/Revenue|Taxation/.test(r.creditor)), 'tax authorities left out of the cross-file list');

  // Name matching: exact, case-insensitive, partial when unique, ambiguity lists candidates.
  eq((await call('history', ['cvl-001'])).appointment.ref, 'CVL-001');
  eq((await call('history', ['ridgeview'])).appointment.ref, 'LIQ-004');
  await fails(() => call('history', ['l']), /ambiguous/);
  await fails(() => call('history', ['nobody']), /not found/);
  await fails(() => call('log', ['CVL-001'], { note: 'x' }), /--actor/);

  // A new Australian liquidation, appointment to close.
  const a = await call('add-appointment', [], { ...A, ref: 'CVL-T1', company: 'Test Fitouts Pty Ltd', appointed: shift(-40), practitioner: 'Test Liquidator' });
  eq(a.kind, 'creditors_voluntary_liquidation');
  eq(a.currency, 'AUD');
  await fails(() => call('add-appointment', [], { ...A, ref: 'cvl-t1', company: 'Dup', appointed: shift(-1), practitioner: 'X' }), /already exists/);
  await fails(() => call('add-appointment', [], { ...A, ref: 'BAD', company: 'Bad', appointed: shift(3), practitioner: 'X' }), /future/);
  await fails(() => call('add-appointment', [], { ...A, ref: 'BAD', company: 'Bad', appointed: shift(-3), practitioner: 'X', kind: 'receivership' }), /--kind/);
  await call('add-creditor', ['CVL-T1'], { ...A, name: 'Emp One', kind: 'employee', owed: '3000' });
  await call('add-creditor', ['CVL-T1'], { ...A, name: 'Trade A', owed: '1,000' });
  await call('add-creditor', ['CVL-T1'], { ...A, name: 'Trade B' });
  const dir = await call('add-creditor', ['CVL-T1'], { ...A, name: 'Director Loan', kind: 'related_party' });
  eq(dir.is_related, true, 'related party flagged');
  await fails(() => call('add-creditor', ['CVL-T1'], { ...A, name: 'trade a' }), /already a creditor/);
  eq((await call('lodge-proof', ['CVL-T1', 'emp one'], { ...A, amount: '3000' })).class, 'employee_wages', 'employee defaults to wages');
  await fails(() => call('lodge-proof', ['CVL-T1', 'Trade A'], { ...A, amount: '10', class: 'tax_preferential' }), /NZ class/);
  await fails(() => call('lodge-proof', ['CVL-T1', 'Trade A'], { ...A, amount: '10', date: shift(-60) }), /before the appointment/);
  await call('lodge-proof', ['CVL-T1', 'Trade A'], { ...A, amount: '1500' });
  await call('lodge-proof', ['CVL-T1', 'Trade B'], { ...A, amount: '2000' });
  await call('lodge-proof', ['CVL-T1', 'Director'], { ...A, amount: '5000' });
  await fails(() => call('lodge-proof', ['CVL-T1', 'Trade'], { ...A, amount: '1' }), /ambiguous/);
  eq((await call('adjudicate', ['CVL-T1', 'Emp One'], { ...A, status: 'admitted' })).status, 'admitted');
  await fails(() => call('adjudicate', ['CVL-T1', 'Trade A'], { ...A, status: 'partly_admitted', amount: '1000' }), /--reason/);
  await fails(() => call('adjudicate', ['CVL-T1', 'Trade A'], { ...A, status: 'partly_admitted', amount: '1500', reason: 'x' }), /less than/);
  eq((await call('adjudicate', ['CVL-T1', 'Trade A'], { ...A, status: 'partly_admitted', amount: '1000', reason: 'Invoice 114 was paid before appointment' })).admitted, '$1,000');
  await call('adjudicate', ['CVL-T1', 'Trade B'], { ...A, status: 'rejected', reason: 'No evidence of supply' });
  await fails(() => call('adjudicate', ['CVL-T1', 'Trade B'], { ...A, status: 'admitted' }), /no proof waiting/);

  // Assets and the cashbook.
  await call('add-asset', ['CVL-T1'], { ...A, description: 'Stock', kind: 'stock', estimate: '10000' });
  await fails(() => call('add-asset', ['CVL-T1'], { ...A, description: 'Boat', kind: 'yacht' }), /--kind/);
  await fails(() => call('realise', ['CVL-T1', 'stock'], { ...A, amount: '0' }), /abandon/);
  eq((await call('realise', ['CVL-T1', 'stock'], { ...A, amount: '8000' })).realised, '$8,000');
  await fails(() => call('realise', ['CVL-T1', 'stock'], { ...A, amount: '1' }), /already realised/);
  await call('add-asset', ['CVL-T1'], { ...A, description: 'Old debtor', kind: 'debtors', estimate: '500' });
  await fails(() => call('abandon', ['CVL-T1', 'old debtor'], A), /--reason/);
  eq((await call('abandon', ['CVL-T1', 'old debtor'], { ...A, reason: 'Customer in liquidation' })).status, 'abandoned');
  await call('receipt', ['CVL-T1'], { ...A, amount: '50', description: 'Bank interest' });
  await fails(() => call('pay', ['CVL-T1'], { ...A, amount: '90000', payee: 'X', description: 'x' }), /not enough/);
  await fails(() => call('pay', ['CVL-T1'], { ...A, amount: '1', payee: 'X', description: 'x', category: 'remuneration' }), /draw-remuneration/);
  await call('pay', ['CVL-T1'], { ...A, amount: '500', payee: 'Test Legal', description: 'Advice', category: 'legal' });

  // Remuneration is drawn only against an approval.
  await fails(() => call('draw-remuneration', ['CVL-T1'], { ...A, amount: '100' }), /further determination/);
  await call('approve-remuneration', ['CVL-T1'], { ...A, amount: '2000', by: 'creditors' });
  await fails(() => call('approve-remuneration', ['CVL-T1'], { ...A, amount: '1', by: 'director' }), /--by/);
  await fails(() => call('draw-remuneration', ['CVL-T1'], { ...A, amount: '2500' }), /Only \$2,000/);
  eq((await call('draw-remuneration', ['CVL-T1'], { ...A, amount: '1500' })).approved_left, '$500');
  await call('log-time', ['CVL-T1'], { ...A, staff: 'Test', hours: '5', rate: '300', task: 'assets' });
  await fails(() => call('log-time', ['CVL-T1'], { ...A, staff: 'Test', hours: '30', rate: '300' }), /at most a day/);
  eq(Number((await call('remuneration', [], { appointment: 'CVL-T1' }))[0].time_cost_cents), 150000, 'time cost = hours x rate');

  // Statutory steps.
  eq((await call('record-step', ['CVL-T1', 'dirri'], { ...A, date: shift(-35) })).state, 'done');
  await fails(() => call('record-step', ['CVL-T1', 'dirri'], A), /already recorded/);
  eq((await call('record-step', ['CVL-T1', 'initial information'], { ...A, date: shift(-33), reference: 'Initial notice' })).state, 'done', 'step found by its label');
  await fails(() => call('record-step', ['CVL-T1', 'six-monthly'], A), /not found/);

  // Meetings refuse short notice.
  await fails(() => call('call-meeting', ['CVL-T1'], { ...A, kind: 'creditors', meeting: shift(3) }), /no earlier than/);
  const m = await call('call-meeting', ['CVL-T1'], { ...A, kind: 'creditors', meeting: shift(20) });
  eq(m.held, false);
  await fails(() => call('hold-meeting', ['CVL-T1', 'creditors'], { ...A, outcome: 'x' }), /once it has been held/);

  // Dividends: notice, proofs close, every proof decided, higher classes first, pro rata to the cent.
  await fails(() => call('notice-dividend', ['CVL-T1'], { ...A, class: 'employee_wages', close: shift(10) }), /21 days/);
  await call('notice-dividend', ['CVL-T1'], { ...A, class: 'employee_wages', date: shift(-35), close: shift(-10) });
  await fails(() => call('notice-dividend', ['CVL-T1'], { ...A, class: 'employee_wages', date: shift(-35), close: shift(-10) }), /already has an open/);
  await fails(() => call('declare-dividend', ['CVL-T1'], { ...A, class: 'unsecured', amount: '100' }), /notice first/);
  const wages = await call('declare-dividend', ['CVL-T1'], { ...A, class: 'employee_wages', amount: '3000' });
  eq(wages.length, 1);
  eq(Number(wages[0].cents_in_dollar), 100);
  await call('notice-dividend', ['CVL-T1'], { ...A, class: 'unsecured', date: shift(-30), close: shift(-5) });
  await fails(() => call('declare-dividend', ['CVL-T1'], { ...A, class: 'unsecured', amount: '1000' }), /Director Loan/);
  await call('adjudicate', ['CVL-T1', 'director'], { ...A, status: 'admitted' });
  await fails(() => call('declare-dividend', ['CVL-T1'], { ...A, class: 'unsecured', amount: '7000' }), /more than the/);
  const unsecured = await call('declare-dividend', ['CVL-T1'], { ...A, class: 'unsecured', amount: '1000' });
  eq(unsecured.reduce((s, r) => s + r.paid_cents, 0), 100000, 'every cent of the pool paid');
  eq(unsecured.find((r) => r.creditor === 'Trade A').paid_cents, 16667, 'largest remainder gets the odd cent');
  eq(Number(unsecured[0].cents_in_dollar), 16.67);
  await call('lodge-proof', ['CVL-T1', 'Emp One'], { ...A, amount: '400', class: 'employee_leave' });
  await call('adjudicate', ['CVL-T1', 'Emp One'], { ...A, status: 'admitted' });
  await call('notice-dividend', ['CVL-T1'], { ...A, class: 'unsecured', date: shift(-30), close: shift(-5) });
  await fails(() => call('declare-dividend', ['CVL-T1'], { ...A, class: 'unsecured', amount: '100' }), /Higher classes.*employee_leave/);

  // Tasks, notes, close.
  await call('add-task', ['CVL-T1'], { ...A, title: 'Final return', due: shift(-1) });
  ok((await call('attention')).some((r) => r.ref === 'CVL-T1' && r.item === 'task overdue'));
  await fails(() => call('close', ['CVL-T1'], A), /--reference/);
  await fails(() => call('close', ['CVL-T1'], { ...A, reference: 'Form 5603' }), /cannot close: cash held .* open task/);
  await call('done', ['CVL-T1', 'final return'], A);
  await call('log', ['CVL-T1'], { ...A, note: 'Spoke to the director' });
  await call('notice-dividend', ['CVL-T1'], { ...A, class: 'employee_leave', date: shift(-30), close: shift(-5) });
  await call('declare-dividend', ['CVL-T1'], { ...A, class: 'employee_leave', amount: '400' });
  const [pt] = await call('position', [], { appointment: 'CVL-T1' });
  await call('declare-dividend', ['CVL-T1'], { ...A, class: 'unsecured', amount: (Number(pt.cash_held_cents) / 100).toFixed(2) });
  eq(Number((await call('position', [], { appointment: 'CVL-T1' }))[0].cash_held_cents), 0, 'all cash out');
  eq((await call('close', ['CVL-T1'], { ...A, reference: 'Form 5603 lodged' })).status, 'closed');
  await fails(() => call('receipt', ['CVL-T1'], { ...A, amount: '1', description: 'x' }), /closed/);
  ok(!(await call('deadlines')).some((r) => r.ref === 'CVL-T1'), 'closed files drop off the calendar');
  ok((await call('history', ['CVL-T1'])).activity.length > 25, 'every write logged');

  // New Zealand: working-day deadlines, fee basis, and a voluntary administration.
  await fails(() => call('draw-remuneration', ['LIQ-003'], { ...A, amount: '9000' }), /--reason/);
  await call('draw-remuneration', ['LIQ-003'], { ...A, amount: '9000', reason: 'Creditors told in the six-monthly report' });
  ok((await call('compliance')).some((r) => r.ref === 'LIQ-003' && r.rule === 'remuneration drawn' && r.severity === 'note'), 'NZ fee overrun is a note');
  const nzva = await call('add-appointment', [], { ...A, ref: 'VA-T2', company: 'Kiwi Test Limited', appointed: shift(-2), practitioner: 'NZ Admin', licence: 'LIP-1', jurisdiction: 'nz', kind: 'va' });
  eq(nzva.currency, 'NZD');
  const nzSteps = await call('deadlines', [], { appointment: 'VA-T2' });
  eq(nzSteps.find((r) => r.step.startsWith('First')).due_on, await wd(shift(-2), 8, 'NZ'), 'NZ first meeting: 8 working days');
  eq(nzSteps.find((r) => r.step.startsWith('Watershed')).due_on, await wd(shift(-2), 25, 'NZ'), 'watershed: 20 + 5 working days');
  await call('add-appointment', [], { ...A, ref: 'VA-T3', company: 'December Test Pty Ltd', appointed: shift(-2), practitioner: 'AU Admin', kind: 'va', extended: true });
  eq((await call('deadlines', [], { appointment: 'VA-T3' })).find((r) => r.step.startsWith('Second')).due_on, await wd(shift(-2), 30, 'AU'), 'extended convening period');
  await call('call-meeting', ['VA-T3'], { ...A, kind: 'first', date: shift(-2), meeting: shift(-2 + 9) });
  await db.query(`update meetings set meeting_on = $1 where kind = 'first' and appointment_id = (select id from appointments where ref = 'VA-T3')`, [shift(-1)]);
  eq((await call('hold-meeting', ['VA-T3', 'first'], { ...A, outcome: 'Committee formed' })).meeting, 'first');
  eq((await call('deadlines', [], { appointment: 'VA-T3' })).find((r) => r.step.startsWith('First creditors')).done_on, shift(-1), 'holding the meeting records the step');
  ok((await call('compliance')).some((r) => r.ref === 'VA-T3' && r.rule === 'first meeting notice' && r.severity === 'breach'), 'short notice caught after the fact');

  // Import from a Turnkey IPS creditor listing saved as CSV.
  const file = path.join(REPO_ROOT, 'examples', 'ips-creditor-listing.csv');
  const map = path.join(REPO_ROOT, 'examples', 'column-map.json');
  const dry = await call('import', ['ips', file], { ...A, appointment: 'VA-002', 'dry-run': true });
  eq(dry.added, 5, 'dry run counts creditors');
  eq(dry.proofs, 5, 'dry run counts proofs');
  eq((await call('creditors', [], { appointment: 'VA-002' })).length, 3, 'dry run rolled back');
  eq((await call('import', ['ips', file], { ...A, appointment: 'VA-002', map })).added, 5);
  eq((await call('import', ['ips', file], { ...A, appointment: 'VA-002' })).skipped, 6, 'repeat import skipped');
  const imported = await call('creditors', [], { appointment: 'VA-002' });
  const priya = imported.find((r) => r.name === 'Priya Raman');
  eq(Number(priya.per_records_cents), 595000, 'one creditor, two claim rows');
  eq(Number(priya.claimed_cents), 595000);
  eq(imported.find((r) => r.name === 'Westpoint Equipment Finance').kind, 'secured', 'type mapped');
  eq(imported.find((r) => r.name.startsWith('Coastal Kitchens Holdings')).related, true, 'related party mapped');
  const ips = await call('proofs', [], { appointment: 'VA-002' });
  eq(ips.find((r) => r.creditor === 'Benchmark Laminates Pty Ltd').lodged_on, '2026-10-02', 'dd/mm/yyyy read');
  eq(ips.find((r) => r.creditor === 'Priya Raman' && r.class === 'employee_leave').status, 'lodged', 'received means not yet decided');
  const conflict = path.join(root, 'conflict.csv');
  writeFileSync(conflict, 'Creditor Name,Amount per Records\nFresh Supplier,10\nBenchmark Laminates Pty Ltd,99\n');
  await fails(() => call('import', ['ips', conflict], { ...A, appointment: 'VA-002' }), /conflict/);
  ok(!(await call('creditors', [], { appointment: 'VA-002' })).some((r) => r.name === 'Fresh Supplier'), 'conflict rolls back the whole file');
  const dup = path.join(root, 'dup.csv');
  writeFileSync(dup, 'Creditor Name,Amount Claimed\nA,1\na,2\n');
  await fails(() => call('import', ['ips', dup], { ...A, appointment: 'VA-002' }), /Duplicate/);
  await fails(() => call('import', ['other', file], A), /Usage/);

  // Helpers.
  assert.throws(() => date('2026-13-01', 'date'), /valid/);
  assert.throws(() => cents('12.345', 'amount'), /amount/);
  eq(cents('$1,234.5', 'amount'), 123450);
  assert.throws(() => parseCsv('x,x\n1,2'), /unique/);
  ok(parseCsv('﻿x,y\r\n"a,b","c""d"\r\n')[0].y === 'c"d', 'CSV quoting');

  // Drafts are written locally and say nothing was sent.
  for (const [cmd, args, f] of [['draft-creditor-update', ['CVL-001'], {}], ['draft-dividend-notice', ['CVL-001'], { class: 'unsecured' }],
    ['draft-rejection-notice', ['CVL-005', 'Signs Direct'], {}], ['weekly-review', [], {}]]) {
    const { file: out } = await call(cmd, args, f);
    ok(existsSync(out), `${cmd} wrote a file`);
    ok(readFileSync(out, 'utf8').includes('Nothing sent'), `${cmd} is a draft`);
  }
  await fails(() => call('draft-rejection-notice', ['CVL-001', 'Northside']), /no rejected/);

  // Export, append-only history, read-only views, and unrelated roles see nothing.
  const archive = await call('export');
  ok(archive.appointments.length === 8 && archive.activity.length > 40 && archive.deadline_rules.length >= 15, 'export holds everything');
  const exportPath = path.join(root, 'export.json');
  await call('export', [], { out: exportPath });
  await fails(() => call('export', [], { out: exportPath }), /EEXIST/);
  await fails(() => db.exec("update activity set actor = 'rewrite'"), /Append-only/);
  await fails(() => db.exec('delete from activity'), /Append-only/);
  await db.exec('begin read only');
  await fails(() => db.query("insert into tasks (appointment_id, title, owner) select id, 'x', 'y' from appointments limit 1"), /read.only/i);
  await db.exec('rollback');
  await db.exec('create role cases_reader');
  await db.exec('grant usage on schema public to cases_reader');
  await db.exec('grant select on appointments, v_position to cases_reader');
  await db.exec('set role cases_reader');
  eq((await db.query('select * from appointments')).length, 0, 'row security hides files from an unrelated role');
  await fails(() => db.query('select * from v_deadlines'), /permission denied/);
  await db.exec('reset role');
  await db.close();
  db = null;

  // The CLI, views and documents, run as a person would.
  const shell = (script, args = [], expect = 0) => {
    const r = spawnSync(process.execPath, [script, ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    assert.equal(r.status, expect, r.stdout + r.stderr);
    checks++;
    return r;
  };
  eq(JSON.parse(shell('scripts/cases.mjs', ['appointments', '--json']).stdout).length, 8);
  ok(shell('scripts/cases.mjs', ['history', 'l'], 1).stderr.includes('ambiguous'));
  ok(shell('scripts/cases.mjs', ['attention', '--nope'], 1).stderr.includes('Unknown option'));
  ok(shell('scripts/cases.mjs', ['--help']).stdout.includes('declare-dividend'));
  ok(shell('scripts/cases.mjs', ['history', 'CVL-001']).stdout.includes('Harbourline Fitouts'));
  ok(shell('scripts/cases.mjs', ['insights']).stdout.includes('10. '));
  for (const s of ['scripts/view.mjs', 'scripts/docs.mjs']) shell(s);
  const week = readFileSync(path.join(root, 'out', 'views', 'week.html'), 'utf8');
  ok(week.includes('CVL-001') && week.includes('statutory step overdue'), 'week view rendered');
  const rp = readdirSync(path.join(root, 'out', 'docs-out', 'receipts-and-payments'));
  eq(rp.length, 8, 'receipts and payments for every file');
  ok(readFileSync(path.join(root, 'out', 'docs-out', 'receipts-and-payments', rp.find((f) => f.includes('cvl-001'))), 'utf8').includes('61,200'), 'receipts listed');
  ok(readdirSync(path.join(root, 'out', 'docs-out', 'dividend-schedule')).length >= 6, 'a schedule for every dividend');
  const { table } = await import('./lib/render.mjs');
  ok(table([{ name: '<script>alert(1)</script>' }]).includes('&lt;script&gt;'), 'HTML escaped');

  // Every command has a recipe, and every recipe names a real command.
  const recipes = readdirSync(path.join(REPO_ROOT, '.claude', 'commands')).filter((f) => f.endsWith('.md') && f !== 'README.md').map((f) => f.slice(0, -3));
  for (const c of commands) ok(recipes.includes(c), `/${c} recipe exists`);
  ok(recipes.length >= commands.length, 'recipes cover the CLI');

  console.log(`PASS: ${checks} checks (${commands.length} CLI commands, ${recipes.length} slash commands): migrations, working days, deadlines, reads, writes, proofs, dividend order, remuneration, meetings, import rollback, drafts, export, row security and rendering.`);
} finally {
  await db?.close();
  rmSync(root, { recursive: true, force: true });
}

// The rules of the insolvency desk. scripts/cases.mjs is a thin shell over run().
// Every write names an actor and leaves a row in the append-only activity log.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from './db.mjs';
import { parseCsv, pick } from './csv.mjs';
import { money } from './format.mjs';

export const today = () => new Date().toISOString().slice(0, 10);

export function date(v, label) {
  const s = String(v ?? '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error(`--${label} must be a valid date (YYYY-MM-DD)`);
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) throw Error(`--${label} must be a valid date (YYYY-MM-DD)`);
  return s;
}

// "12,345.60" or "$12345.6" -> 1234560 cents. Never guesses at a blank.
export function cents(v, label) {
  const s = String(v ?? '').replace(/[$,\s]/g, '').replace(/^(NZD|AUD)/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw Error(`--${label} must be an amount like 1234.56`);
  return Math.round(parseFloat(s) * 100);
}

function need(flags, ...keys) {
  for (const k of keys) if (flags[k] === undefined || flags[k] === true || String(flags[k]).trim() === '') throw Error(`--${k} is required`);
}
function oneOf(v, allowed, label) {
  if (!allowed.includes(v)) throw Error(`--${label} must be one of: ${allowed.join(', ')}`);
  return v;
}
const dateOr = (v, label) => (v ? date(v, label) : today());

async function tx(db, fn) {
  await db.exec('begin');
  try { const r = await fn(); await db.exec('commit'); return r; } catch (e) { await db.exec('rollback'); throw e; }
}
async function note(db, appointmentId, actor, action, detail) {
  await db.query('insert into activity (appointment_id, actor, action, detail) values ($1,$2,$3,$4)', [appointmentId, actor, action, detail]);
}

// Resolve one record from a reference, id prefix or name. Exact (case-insensitive) beats partial;
// more than one partial match lists the candidates and fails.
function choose(rows, term, what, label) {
  const t = String(term ?? '').trim().toLowerCase();
  if (!t || t === 'true') throw Error(`Name the ${what.toLowerCase()}`);
  const exact = rows.filter((r) => label(r).some((x) => String(x).toLowerCase() === t));
  if (exact.length === 1) return exact[0];
  const partial = exact.length ? exact : rows.filter((r) => label(r).some((x) => String(x).toLowerCase().includes(t)));
  if (partial.length === 1) return partial[0];
  if (!partial.length) throw Error(`${what} "${term}" not found`);
  throw Error(`"${term}" is ambiguous: ${partial.map((r) => label(r).filter(Boolean).slice(0, 2).join(' / ')).join('; ')}`);
}
export async function appointment(db, term) {
  const rows = await db.query('select * from appointments order by ref');
  return choose(rows, term, 'Appointment', (r) => [r.ref, r.company_name, r.company_number, r.id]);
}
async function openAppointment(db, term) {
  const a = await appointment(db, term);
  if (a.status === 'closed') throw Error(`${a.ref} is closed`);
  return a;
}
async function creditor(db, a, term) {
  const rows = await db.query('select * from creditors where appointment_id = $1 order by name', [a.id]);
  return choose(rows, term, 'Creditor', (r) => [r.name, r.id]);
}
async function asset(db, a, term) {
  const rows = await db.query('select * from assets where appointment_id = $1 order by description', [a.id]);
  return choose(rows, term, 'Asset', (r) => [r.description, r.id]);
}
const filterId = async (db, flags) => (flags.appointment ? (await appointment(db, flags.appointment)).id : null);

// The period rules the desk enforces (notice periods, dividend windows). See docs/compliance.md.
async function periodRule(db, juris, rule) {
  const [r] = await db.query('select * from period_rules where jurisdiction = $1 and rule = $2', [juris, rule]);
  return r || null;
}
async function addDays(db, start, unit, amount, juris) {
  const [r] = await db.query('select deadline_due($1::date, $2, $3, $4) as d', [start, unit, amount, juris]);
  return r.d;
}
async function cashHeld(db, a) {
  const [p] = await db.query('select cash_held_cents from v_position where appointment_id = $1', [a.id]);
  return Number(p.cash_held_cents);
}
async function needCash(db, a, amount) {
  const held = await cashHeld(db, a);
  if (held < amount) throw Error(`Cash held is ${money(held, a.currency)}: not enough to pay ${money(amount, a.currency)}`);
}

const KINDS = ['creditors_voluntary_liquidation', 'court_liquidation', 'voluntary_administration'];
const KIND_SHORT = { cvl: 'creditors_voluntary_liquidation', court: 'court_liquidation', va: 'voluntary_administration', shareholders: 'creditors_voluntary_liquidation' };
const CREDITOR_KINDS = ['trade', 'employee', 'tax_authority', 'secured', 'related_party', 'other'];
const CLASSES = ['employee_wages', 'employee_leave', 'employee_redundancy', 'tax_preferential', 'unsecured'];
const RANK = { employee_wages: 1, employee_leave: 2, employee_redundancy: 3, tax_preferential: 4, unsecured: 9 };
const ASSET_KINDS = ['cash_at_bank', 'debtors', 'plant', 'stock', 'vehicle', 'property', 'recovery_claim', 'other'];
const PAY_CATEGORIES = ['legal', 'agent', 'trading', 'tax', 'other'];
const TASKS = ['assets', 'creditors', 'employees', 'investigation', 'dividend', 'administration', 'trade_on'];
const MEETINGS = ['first', 'second', 'creditors', 'committee', 'other'];

// ------------------------------------------------------------------ reads

export const reads = {
  async appointments(db) {
    return db.query(`select a.ref, a.company_name as company, a.jurisdiction as juris, a.kind, a.manager, a.appointed_on as appointed,
        a.status, p.currency, p.cash_held_cents, p.assets_to_realise as to_realise, p.proofs_to_adjudicate as proofs_open,
        (select count(*) from v_deadlines d where d.appointment_id = a.id and d.state in ('overdue','due this week'))::int as steps_due
      from appointments a join v_position p on p.appointment_id = a.id
      order by a.status = 'closed', a.ref`);
  },
  async attention(db) {
    return db.query(`select ref, owner, item, detail, date,
        case when days is null then '' when days < 0 then 'in ' || -days || ' days' when days = 0 then 'today' else days || ' days ago' end as timing
      from v_attention
      order by case item when 'statutory step overdue' then 0 when 'remuneration over approval' then 1 when 'statutory step due this week' then 2
        when 'meeting coming up' then 3 when 'proof waiting on adjudication' then 4 when 'task overdue' then 5 when 'asset not realised' then 6 else 7 end,
        days desc nulls last, ref`);
  },
  async deadlines(db, args, flags) {
    const id = await filterId(db, flags);
    const days = flags.days === undefined ? 60 : Number(flags.days);
    if (!Number.isInteger(days) || days < 0) throw Error('--days must be a whole number');
    return db.query(`select ref, step, due_on, state, done_on, reference, source from v_deadlines
      where ($1::uuid is null or appointment_id = $1)
        and ($1::uuid is not null or state in ('overdue','due this week') or (state = 'upcoming' and due_on <= current_date + $2::int))
      order by case state when 'overdue' then 0 when 'due this week' then 1 when 'upcoming' then 2 else 3 end, due_on, ref`, [id, days]);
  },
  async creditors(db, args, flags) {
    need(flags, 'appointment');
    const a = await appointment(db, flags.appointment);
    return db.query(`select c.name, c.kind, c.is_related as related, $2::text as currency, c.per_records_cents,
        coalesce(sum(p.claimed_cents), 0) as claimed_cents, coalesce(sum(p.admitted_cents), 0) as admitted_cents,
        string_agg(distinct p.status, ', ') as proof_status,
        coalesce((select sum(l.amount_cents) from ledger l where l.creditor_id = c.id and l.kind = 'dividend'), 0) as dividends_cents
      from creditors c left join proofs p on p.creditor_id = c.id
      where c.appointment_id = $1 group by c.id order by c.kind, c.name`, [a.id, a.currency]);
  },
  async proofs(db, args, flags) {
    const id = await filterId(db, flags);
    const status = flags.status ? oneOf(flags.status, ['lodged', 'admitted', 'partly_admitted', 'rejected', 'withdrawn'], 'status') : null;
    return db.query(`select a.ref, c.name as creditor, p.class, p.status, p.lodged_on, a.currency, p.claimed_cents, p.admitted_cents, p.adjudicated_on, p.reason
      from proofs p join creditors c on c.id = p.creditor_id join appointments a on a.id = p.appointment_id
      where ($1::uuid is null or a.id = $1) and ($2::text is null or p.status = $2) and (a.status = 'open' or $1::uuid is not null)
      order by a.ref, p.status <> 'lodged', p.lodged_on`, [id, status]);
  },
  async assets(db, args, flags) {
    const id = await filterId(db, flags);
    return db.query(`select a.ref, x.description, x.kind, x.status, a.currency, x.estimated_cents, x.realised_cents, x.realised_on, coalesce(c.name, '') as secured_to
      from assets x join appointments a on a.id = x.appointment_id left join creditors c on c.id = x.secured_to
      where ($1::uuid is null or a.id = $1) and (a.status = 'open' or $1::uuid is not null)
      order by a.ref, x.status <> 'to_realise', x.description`, [id]);
  },
  async cashbook(db, args, flags) {
    need(flags, 'appointment');
    const a = await appointment(db, flags.appointment);
    return db.query(`select l.occurred_on as date, l.kind, l.category, l.description, coalesce(nullif(l.payee, ''), c.name, '') as party,
        $2::text as currency, l.amount_cents
      from ledger l left join creditors c on c.id = l.creditor_id where l.appointment_id = $1 order by l.occurred_on, l.created_at`, [a.id, a.currency]);
  },
  async position(db, args, flags) {
    const id = await filterId(db, flags);
    return db.query(`select ref, company_name as company, manager, currency, estimated_cents, receipts_cents, payments_cents, dividends_cents,
        cash_held_cents, assets_to_realise as to_realise
      from v_position where ($1::uuid is null or appointment_id = $1) and (status = 'open' or $1::uuid is not null) order by ref`, [id]);
  },
  async remuneration(db, args, flags) {
    const id = await filterId(db, flags);
    return db.query(`select ref, company_name as company, manager, currency, approved_cents, drawn_cents, time_cost_cents,
        round(minutes / 60.0, 1) as hours, approved_cents - drawn_cents as headroom_cents,
        case when drawn_cents > approved_cents then 'over approval' when time_cost_cents > approved_cents then 'time above approval' else 'within approval' end as state
      from v_remuneration where ($1::uuid is null or appointment_id = $1) and (status = 'open' or $1::uuid is not null) order by ref`, [id]);
  },
  async classes(db, args, flags) {
    const id = await filterId(db, flags);
    return db.query(`select k.ref, k.class, k.admitted_proofs, k.lodged_proofs, k.currency, k.admitted_cents, k.paid_cents,
        k.admitted_cents - k.paid_cents as outstanding_cents,
        case when k.admitted_cents = 0 then null else round(100.0 * k.paid_cents / k.admitted_cents, 2) end as paid_cents_in_dollar
      from v_classes k join appointments a on a.id = k.appointment_id
      where ($1::uuid is null or k.appointment_id = $1) and (a.status = 'open' or $1::uuid is not null) order by k.ref, k.rank`, [id]);
  },
  async meetings(db, args, flags) {
    const id = await filterId(db, flags);
    return db.query(`select a.ref, m.kind, m.notice_sent_on as notice_sent, m.meeting_on, m.held, m.outcome
      from meetings m join appointments a on a.id = m.appointment_id where ($1::uuid is null or a.id = $1) order by m.meeting_on desc`, [id]);
  },
  async tasks(db, args, flags) {
    const id = await filterId(db, flags);
    return db.query(`select a.ref, t.title, t.owner, t.due_on, case when t.due_on < current_date then current_date - t.due_on else 0 end as days_late
      from tasks t join appointments a on a.id = t.appointment_id
      where t.done_on is null and ($1::uuid is null or a.id = $1) order by t.due_on nulls last`, [id]);
  },
  async compliance(db) { return compliance(db); },
  async insights(db) { return runInsights(db); },
};

export async function compliance(db) {
  const rows = [];
  const add = (ref, rule, severity, finding, source) => rows.push({ ref, rule, severity, finding, source });
  for (const d of await db.query(`select * from v_deadlines where state in ('overdue','due this week','done late')`)) {
    if (d.state === 'overdue') add(d.ref, d.step, 'breach', `Due ${d.due_on}, not recorded as done`, d.source);
    else if (d.state === 'due this week') add(d.ref, d.step, 'due', `Due ${d.due_on}`, d.source);
    else add(d.ref, d.step, 'note', `Done ${d.done_on}, after the due date of ${d.due_on}`, d.source);
  }
  // Meeting notice shorter than the period the rules require.
  for (const m of await db.query(`select m.*, a.ref, a.jurisdiction from meetings m join appointments a on a.id = m.appointment_id where a.status = 'open'`)) {
    const r = await periodRule(db, m.jurisdiction, `notice_${m.kind}`);
    if (!r) continue;
    const earliest = await addDays(db, m.notice_sent_on, r.unit, r.amount, m.jurisdiction);
    if (m.meeting_on < earliest) add(m.ref, `${m.kind} meeting notice`, 'breach', `Notice sent ${m.notice_sent_on} for a meeting on ${m.meeting_on}; ${r.amount} ${r.unit.replace('_', ' ')} needed, so not before ${earliest}`, r.source);
  }
  for (const r of await db.query(`select * from v_remuneration where status = 'open'`)) {
    // AU: remuneration follows a determination by creditors, the committee or the court. NZ: a liquidator
    // appointed by shareholders or the board charges reasonable remuneration, open to court review, so the
    // approval recorded here is the firm's own fee basis and an overrun is a note, not a breach.
    const au = r.jurisdiction === 'AU';
    const src = au ? 'Insolvency Practice Schedule (Corporations) s 60-5, s 60-10' : 'Companies Act 1993 (NZ) s 276, s 284(1)(e)';
    if (Number(r.drawn_cents) > Number(r.approved_cents)) add(r.ref, 'remuneration drawn', au ? 'breach' : 'note', `Drawn ${money(r.drawn_cents, r.currency)} against ${money(r.approved_cents, r.currency)} ${au ? 'approved' : 'recorded as the fee basis'}`, src);
    else if (au && Number(r.time_cost_cents) > Number(r.approved_cents)) add(r.ref, 'remuneration approval', 'due', `Time recorded ${money(r.time_cost_cents, r.currency)} is above the ${money(r.approved_cents, r.currency)} approved: seek a further determination before drawing it`, src);
  }
  // A lower class paid while a higher class still has admitted claims outstanding.
  for (const r of await db.query(`select lo.ref, lo.class as paid_class, hi.class as unpaid_class, hi.currency, hi.admitted_cents - hi.paid_cents as short_cents, a.jurisdiction
      from v_classes lo join v_classes hi on hi.appointment_id = lo.appointment_id and hi.rank < lo.rank
      join appointments a on a.id = lo.appointment_id
      where lo.paid_cents > 0 and hi.admitted_cents > hi.paid_cents and a.status = 'open'`)) {
    add(r.ref, 'order of payment', 'breach', `${r.paid_class} paid while ${r.unpaid_class} is short ${money(r.short_cents, r.currency)}`,
      r.jurisdiction === 'AU' ? 'Corporations Act 2001 s 556' : 'Companies Act 1993 (NZ) s 312 and Schedule 7');
  }
  // Proofs not dealt with in time after a dividend notice closed.
  for (const p of await db.query(`select a.ref, a.jurisdiction, c.name, p.class, d.proofs_close_on
      from proofs p join creditors c on c.id = p.creditor_id join appointments a on a.id = p.appointment_id
      join dividends d on d.appointment_id = a.id and d.class = p.class and d.declared_on is null
      where p.status = 'lodged' and a.status = 'open' and d.proofs_close_on < current_date`)) {
    const r = await periodRule(db, p.jurisdiction, 'adjudicate_within');
    if (!r) { add(p.ref, 'proof adjudication', 'due', `${p.name} (${p.class}) lodged and not yet admitted or rejected; proofs closed ${p.proofs_close_on}`, p.jurisdiction === 'NZ' ? 'Companies Act 1993 (NZ) s 304(3): as soon as practicable' : 'Local check'); continue; }
    const by = await addDays(db, p.proofs_close_on, r.unit, r.amount, p.jurisdiction);
    add(p.ref, 'proof adjudication', by < today() ? 'breach' : 'due', `${p.name} (${p.class}): admit or reject by ${by}`, r.source);
  }
  for (const a of await db.query(`select ref from appointments where jurisdiction = 'NZ' and status = 'open' and trim(practitioner_licence) = ''`)) {
    add(a.ref, 'licensed practitioner', 'due', 'No licence number recorded for the appointed practitioner', 'Insolvency Practitioners Regulation Act 2019 (NZ); Companies Act 1993 s 280');
  }
  const order = { breach: 0, due: 1, note: 2 };
  return rows.sort((a, b) => order[a.severity] - order[b.severity] || a.ref.localeCompare(b.ref));
}

// ------------------------------------------------------------------ ten questions

export const insights = [
  ['Which statutory steps fall due in the next 30 days, by manager?', `
    select manager, ref, step, due_on, state from v_deadlines
    where state in ('overdue','due this week') or (state = 'upcoming' and due_on <= current_date + 30)
    order by manager, due_on`],
  ['If every class were paid from the cash held today, how many cents in the dollar would each class get?', `
    with c as (select k.*, p.cash_held_cents, a.status from v_classes k join v_position p on p.appointment_id = k.appointment_id join appointments a on a.id = k.appointment_id
               where a.status = 'open' and k.admitted_cents > k.paid_cents),
    w as (select c.*, coalesce(sum(admitted_cents - paid_cents) over (partition by appointment_id order by rank rows between unbounded preceding and 1 preceding), 0) as ahead_cents from c)
    select ref, class, currency, admitted_cents - paid_cents as outstanding_cents, cash_held_cents,
      round(100.0 * least(greatest(cash_held_cents - ahead_cents, 0), admitted_cents - paid_cents) / (admitted_cents - paid_cents), 2) as cents_in_dollar
    from w order by ref, rank`],
  ["Which proofs claim much more than the company's own records show?", `
    select a.ref, c.name as creditor, a.currency, c.per_records_cents, p.claimed_cents, p.claimed_cents - c.per_records_cents as gap_cents, p.status
    from proofs p join creditors c on c.id = p.creditor_id join appointments a on a.id = p.appointment_id
    where c.per_records_cents is not null and p.claimed_cents > c.per_records_cents * 1.1 and p.status not in ('rejected','withdrawn')
    order by p.claimed_cents - c.per_records_cents desc`],
  ["Which assets sold for less than the directors' estimate, and by how much?", `
    select a.ref, x.description, a.currency, x.estimated_cents, x.realised_cents, x.estimated_cents - x.realised_cents as shortfall_cents
    from assets x join appointments a on a.id = x.appointment_id
    where x.status in ('realised','abandoned') and x.estimated_cents > x.realised_cents order by x.estimated_cents - x.realised_cents desc`],
  ['Which related parties have lodged proofs, and how much of the vote do they hold?', `
    select a.ref, c.name as creditor, a.currency, p.claimed_cents,
      round(100.0 * p.claimed_cents / nullif((select sum(q.claimed_cents) from proofs q where q.appointment_id = a.id and q.status not in ('rejected','withdrawn')), 0), 1) as share_of_claims_pct
    from proofs p join creditors c on c.id = p.creditor_id join appointments a on a.id = p.appointment_id
    where c.is_related and p.status not in ('rejected','withdrawn') and a.status = 'open' order by share_of_claims_pct desc`],
  ['How long does each manager take to admit or reject a proof?', `
    select a.manager, count(*)::int as proofs, round(avg(p.adjudicated_on - p.lodged_on), 1) as avg_days, max(p.adjudicated_on - p.lodged_on) as slowest_days
    from proofs p join appointments a on a.id = p.appointment_id where p.adjudicated_on is not null group by a.manager order by avg_days desc`],
  ['Where is staff time going across open files, by task?', `
    select t.task, count(distinct t.appointment_id)::int as files, round(sum(t.minutes) / 60.0, 1) as hours,
      round(100.0 * sum(t.minutes) / nullif((select sum(minutes) from time_entries x join appointments y on y.id = x.appointment_id where y.status = 'open'), 0), 1) as pct_of_time
    from time_entries t join appointments a on a.id = t.appointment_id where a.status = 'open' group by t.task order by hours desc`],
  ['Which files have recorded more time than the remuneration approved?', `
    select ref, manager, currency, approved_cents, time_cost_cents, time_cost_cents - approved_cents as unapproved_cents
    from v_remuneration where status = 'open' and time_cost_cents > approved_cents order by time_cost_cents - approved_cents desc`],
  ['Which open files have held cash longest without a dividend?', `
    select p.ref, p.company_name as company, p.currency, p.cash_held_cents, current_date - a.appointed_on as days_open,
      (select max(l.occurred_on) from ledger l where l.appointment_id = a.id and l.kind = 'dividend') as last_dividend
    from v_position p join appointments a on a.id = p.appointment_id
    where a.status = 'open' and p.cash_held_cents > 0 order by days_open desc`],
  ['Which suppliers and lenders are creditors in more than one of our files?', `
    select min(c.name) as creditor, count(distinct c.appointment_id)::int as files,
      string_agg(a.ref || ' ' || coalesce(p.status, 'no proof'), ', ' order by a.ref) as files_and_proofs
    from creditors c join appointments a on a.id = c.appointment_id left join proofs p on p.creditor_id = c.id
    where c.kind not in ('tax_authority','employee')
    group by lower(c.name) having count(distinct c.appointment_id) > 1 order by files desc, creditor`],
];
export async function runInsights(db) {
  const out = [];
  for (const [question, sql] of insights) out.push({ question, rows: await db.query(sql) });
  return out;
}

// ------------------------------------------------------------------ writes

const writes = {
  async 'add-appointment'(db, args, f) {
    need(f, 'actor', 'ref', 'company', 'appointed', 'practitioner');
    const juris = oneOf(String(f.jurisdiction || 'AU').toUpperCase(), ['AU', 'NZ'], 'jurisdiction');
    const kind = oneOf(KIND_SHORT[String(f.kind || 'cvl').toLowerCase()] || String(f.kind), KINDS, 'kind');
    const on = date(f.appointed, 'appointed');
    if (on > today()) throw Error('The appointment date cannot be in the future');
    return tx(db, async () => {
      if ((await db.query('select 1 from appointments where lower(ref) = lower($1)', [f.ref])).length) throw Error(`Appointment ${f.ref} already exists (refs are unique)`);
      const [a] = await db.query(`insert into appointments (ref, company_name, company_number, jurisdiction, kind, appointed_on, practitioner, practitioner_licence, manager, convening_extended, currency)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning *`,
        [f.ref, f.company, f.number || '', juris, kind, on, f.practitioner, f.licence || '', f.manager || f.actor,
         f.extended === true || f.extended === 'yes', String(f.currency || (juris === 'NZ' ? 'NZD' : 'AUD')).toUpperCase()]);
      await note(db, a.id, f.actor, 'add-appointment', `${a.ref} ${a.company_name}: ${kind.replace(/_/g, ' ')} from ${on}`);
      return a;
    });
  },
  async 'add-creditor'(db, [term], f) {
    need(f, 'actor', 'name');
    const a = await openAppointment(db, term);
    const kind = oneOf(f.kind || 'trade', CREDITOR_KINDS, 'kind');
    return tx(db, async () => {
      if ((await db.query('select 1 from creditors where appointment_id = $1 and lower(name) = lower($2)', [a.id, f.name])).length) throw Error(`${f.name} is already a creditor of ${a.ref}`);
      const [c] = await db.query(`insert into creditors (appointment_id, name, kind, contact, per_records_cents, is_related) values ($1,$2,$3,$4,$5,$6) returning *`,
        [a.id, f.name, kind, f.contact || '', f.owed === undefined ? null : cents(f.owed, 'owed'), kind === 'related_party' || f.related === true || f.related === 'yes']);
      await note(db, a.id, f.actor, 'add-creditor', `${c.name} (${kind})${c.per_records_cents !== null ? `, ${money(c.per_records_cents, a.currency)} per records` : ''}`);
      return c;
    });
  },
  async 'lodge-proof'(db, [term, who], f) {
    need(f, 'actor', 'amount');
    const a = await openAppointment(db, term);
    const c = await creditor(db, a, who);
    const cls = oneOf(f.class || (c.kind === 'employee' ? 'employee_wages' : 'unsecured'), CLASSES, 'class');
    if (cls === 'tax_preferential' && a.jurisdiction !== 'NZ') throw Error('tax_preferential is the NZ class for preferential tax claims; in Australia tax debts are unsecured');
    const on = dateOr(f.date, 'date');
    if (on < a.appointed_on) throw Error('A proof cannot be lodged before the appointment');
    return tx(db, async () => {
      const [p] = await db.query(`insert into proofs (appointment_id, creditor_id, lodged_on, class, claimed_cents) values ($1,$2,$3,$4,$5) returning *`,
        [a.id, c.id, on, cls, cents(f.amount, 'amount')]);
      await note(db, a.id, f.actor, 'lodge-proof', `${c.name}: ${money(p.claimed_cents, a.currency)} ${cls}`);
      return p;
    });
  },
  // Admit, part-admit or reject. A part admission or a rejection needs the reason in writing.
  async adjudicate(db, [term, who], f) {
    need(f, 'actor', 'status');
    const a = await openAppointment(db, term);
    const c = await creditor(db, a, who);
    const status = oneOf(f.status, ['admitted', 'partly_admitted', 'rejected'], 'status');
    const [p] = await db.query(`select * from proofs where creditor_id = $1 and status = 'lodged' order by lodged_on limit 1`, [c.id]);
    if (!p) throw Error(`${c.name} has no proof waiting on adjudication`);
    if (status !== 'admitted' && !f.reason) throw Error('--reason is required to part-admit or reject a proof (it goes in the notice to the creditor)');
    const admitted = status === 'admitted' ? Number(p.claimed_cents) : status === 'rejected' ? 0 : cents(f.amount ?? '', 'amount');
    if (status === 'partly_admitted' && (admitted <= 0 || admitted >= Number(p.claimed_cents))) throw Error(`--amount must be more than zero and less than the ${money(p.claimed_cents, a.currency)} claimed`);
    const on = dateOr(f.date, 'date');
    if (on < p.lodged_on) throw Error('Adjudication cannot be dated before the proof was lodged');
    return tx(db, async () => {
      const [r] = await db.query(`update proofs set status = $2, admitted_cents = $3, adjudicated_on = $4, reason = $5 where id = $1 returning *`,
        [p.id, status, admitted, on, f.reason || '']);
      await note(db, a.id, f.actor, 'adjudicate', `${c.name}: ${status.replace('_', ' ')} ${money(admitted, a.currency)} of ${money(p.claimed_cents, a.currency)}${f.reason ? ` (${f.reason})` : ''}`);
      return { appointment: a.ref, creditor: c.name, status: r.status, admitted: money(admitted, a.currency), claimed: money(p.claimed_cents, a.currency) };
    });
  },
  async 'add-asset'(db, [term], f) {
    need(f, 'actor', 'description');
    const a = await openAppointment(db, term);
    const secured = f.secured ? (await creditor(db, a, f.secured)).id : null;
    return tx(db, async () => {
      const [x] = await db.query(`insert into assets (appointment_id, description, kind, estimated_cents, secured_to) values ($1,$2,$3,$4,$5) returning *`,
        [a.id, f.description, oneOf(f.kind || 'other', ASSET_KINDS, 'kind'), f.estimate === undefined ? null : cents(f.estimate, 'estimate'), secured]);
      await note(db, a.id, f.actor, 'add-asset', `${x.description}${x.estimated_cents !== null ? ` estimated ${money(x.estimated_cents, a.currency)}` : ''}`);
      return x;
    });
  },
  // Money in from an asset: sold, collected or settled.
  async realise(db, [term, what], f) {
    need(f, 'actor', 'amount');
    const a = await openAppointment(db, term);
    const x = await asset(db, a, what);
    if (x.status !== 'to_realise') throw Error(`${x.description} is already ${x.status}`);
    const amount = cents(f.amount, 'amount');
    if (amount === 0) throw Error('--amount must be more than zero. If nothing was recovered, use abandon with a reason');
    const on = dateOr(f.date, 'date');
    return tx(db, async () => {
      await db.query(`update assets set status = 'realised', realised_cents = $2, realised_on = $3 where id = $1`, [x.id, amount, on]);
      await db.query(`insert into ledger (appointment_id, occurred_on, kind, category, description, amount_cents, asset_id) values ($1,$2,'receipt','realisation',$3,$4,$5)`,
        [a.id, on, f.note || `${x.description} realised`, amount, x.id]);
      await note(db, a.id, f.actor, 'realise', `${x.description}: ${money(amount, a.currency)}${x.secured_to ? ' (subject to a security interest: account to the secured creditor)' : ''}`);
      return { appointment: a.ref, asset: x.description, realised: money(amount, a.currency), estimate: x.estimated_cents === null ? 'none' : money(x.estimated_cents, a.currency) };
    });
  },
  async abandon(db, [term, what], f) {
    need(f, 'actor', 'reason');
    const a = await openAppointment(db, term);
    const x = await asset(db, a, what);
    if (x.status !== 'to_realise') throw Error(`${x.description} is already ${x.status}`);
    return tx(db, async () => {
      await db.query(`update assets set status = 'abandoned', realised_on = $2, notes = trim(notes || ' ' || $3) where id = $1`, [x.id, today(), f.reason]);
      await note(db, a.id, f.actor, 'abandon', `${x.description}: ${f.reason}`);
      return { appointment: a.ref, asset: x.description, status: 'abandoned' };
    });
  },
  async receipt(db, [term], f) {
    need(f, 'actor', 'amount', 'description');
    const a = await openAppointment(db, term);
    const amount = cents(f.amount, 'amount');
    return tx(db, async () => {
      await db.query(`insert into ledger (appointment_id, occurred_on, kind, category, description, amount_cents, payee) values ($1,$2,'receipt',$3,$4,$5,$6)`,
        [a.id, dateOr(f.date, 'date'), oneOf(f.category || 'other', ['trading', 'other', 'tax'], 'category'), f.description, amount, f.from || '']);
      await note(db, a.id, f.actor, 'receipt', `${f.description} ${money(amount, a.currency)}`);
      return { appointment: a.ref, received: money(amount, a.currency), description: f.description };
    });
  },
  // Money out for costs. Remuneration goes through draw-remuneration, dividends through declare-dividend.
  async pay(db, [term], f) {
    need(f, 'actor', 'amount', 'payee', 'description');
    const a = await openAppointment(db, term);
    if (f.category === 'remuneration') throw Error('Remuneration is drawn with draw-remuneration, which checks it against what was approved');
    const category = oneOf(f.category || 'other', PAY_CATEGORIES, 'category');
    const amount = cents(f.amount, 'amount');
    return tx(db, async () => {
      await needCash(db, a, amount);
      await db.query(`insert into ledger (appointment_id, occurred_on, kind, category, description, amount_cents, payee) values ($1,$2,'payment',$3,$4,$5,$6)`,
        [a.id, dateOr(f.date, 'date'), category, f.description, amount, f.payee]);
      await note(db, a.id, f.actor, 'pay', `${f.payee}: ${f.description} ${money(amount, a.currency)}`);
      return { appointment: a.ref, paid: money(amount, a.currency), payee: f.payee, cash_left: money(await cashHeld(db, a), a.currency) };
    });
  },
  async 'approve-remuneration'(db, [term], f) {
    need(f, 'actor', 'amount', 'by');
    const a = await openAppointment(db, term);
    const amount = cents(f.amount, 'amount');
    return tx(db, async () => {
      const [r] = await db.query(`insert into remuneration_approvals (appointment_id, approved_on, approved_by, amount_cents, period) values ($1,$2,$3,$4,$5) returning *`,
        [a.id, dateOr(f.date, 'date'), oneOf(f.by, ['creditors', 'committee', 'court'], 'by'), amount, f.period || '']);
      await note(db, a.id, f.actor, 'approve-remuneration', `${money(amount, a.currency)} approved by ${r.approved_by}${r.period ? ` for ${r.period}` : ''}`);
      return r;
    });
  },
  async 'log-time'(db, [term], f) {
    need(f, 'actor', 'staff', 'rate');
    const a = await openAppointment(db, term);
    const minutes = f.minutes !== undefined ? Number(f.minutes) : Math.round(Number(f.hours) * 60);
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1440) throw Error('Give --hours or --minutes (more than zero, at most a day)');
    return tx(db, async () => {
      const [t] = await db.query(`insert into time_entries (appointment_id, worked_on, staff, task, minutes, rate_cents, description) values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [a.id, dateOr(f.date, 'date'), f.staff, oneOf(f.task || 'administration', TASKS, 'task'), minutes, cents(f.rate, 'rate'), f.description || '']);
      await note(db, a.id, f.actor, 'log-time', `${f.staff} ${minutes} min ${t.task}`);
      return t;
    });
  },
  // Refuses to draw more than creditors, the committee or the court approved.
  async 'draw-remuneration'(db, [term], f) {
    need(f, 'actor', 'amount');
    const a = await openAppointment(db, term);
    const amount = cents(f.amount, 'amount');
    return tx(db, async () => {
      const [r] = await db.query('select * from v_remuneration where appointment_id = $1', [a.id]);
      const left = Number(r.approved_cents) - Number(r.drawn_cents);
      if (amount > left && (a.jurisdiction === 'AU' || !f.reason)) throw Error(`Only ${money(Math.max(left, 0), a.currency)} of approved remuneration is undrawn. ${a.jurisdiction === 'AU' ? 'Get a further determination first (approve-remuneration)' : 'Record a further fee approval, or give --reason for drawing above it'}`);
      await needCash(db, a, amount);
      await db.query(`insert into ledger (appointment_id, occurred_on, kind, category, description, amount_cents, payee) values ($1,$2,'payment','remuneration',$3,$4,$5)`,
        [a.id, dateOr(f.date, 'date'), f.description || 'Remuneration drawn', amount, a.practitioner]);
      await note(db, a.id, f.actor, 'draw-remuneration', `${money(amount, a.currency)} drawn${amount > left ? `, above the recorded fee basis: ${f.reason}` : ''}`);
      return { appointment: a.ref, drawn: money(amount, a.currency), approved_left: money(left - amount, a.currency) };
    });
  },
  // A statutory step done: initial notice, report, return lodged. The step name comes from the rules.
  async 'record-step'(db, [term, what], f) {
    need(f, 'actor');
    const a = await openAppointment(db, term);
    const rules = await db.query('select * from deadline_rules where jurisdiction = $1 and $2 = any(kinds) order by event', [a.jurisdiction, a.kind]);
    const r = choose(rules, what, 'Statutory step', (x) => [x.event, x.label]);
    const on = dateOr(f.date, 'date');
    let period = f.period === undefined ? null : Number(f.period);
    if (period === null) {
      const [open] = await db.query(`select min(period_no) as n from v_deadlines where appointment_id = $1 and event = $2 and done_on is null`, [a.id, r.event]);
      if (open.n === null) throw Error(`${r.label} is already recorded for every period so far`);
      period = Number(open.n);
    }
    if (!Number.isInteger(period) || period < 1) throw Error('--period must be a whole number from 1');
    return tx(db, async () => {
      if ((await db.query('select 1 from events where appointment_id = $1 and event = $2 and period_no = $3', [a.id, r.event, period])).length) throw Error(`${r.label} #${period} is already recorded`);
      await db.query('insert into events (appointment_id, event, period_no, done_on, reference) values ($1,$2,$3,$4,$5)', [a.id, r.event, period, on, f.reference || '']);
      await note(db, a.id, f.actor, 'record-step', `${r.label}${r.repeat_months ? ` #${period}` : ''} done ${on}${f.reference ? ` (${f.reference})` : ''}`);
      const [d] = await db.query('select step, due_on, state from v_deadlines where appointment_id = $1 and event = $2 and period_no = $3', [a.id, r.event, period]);
      return { appointment: a.ref, ...d, done_on: on };
    });
  },
  // A meeting called. Refuses notice shorter than the period in the rules.
  async 'call-meeting'(db, [term], f) {
    need(f, 'actor', 'kind', 'meeting');
    const a = await openAppointment(db, term);
    const kind = oneOf(f.kind, MEETINGS, 'kind');
    const notice = dateOr(f.date, 'date');
    const on = date(f.meeting, 'meeting');
    const r = await periodRule(db, a.jurisdiction, `notice_${kind}`);
    if (r) {
      const earliest = await addDays(db, notice, r.unit, r.amount, a.jurisdiction);
      if (on < earliest) throw Error(`Notice sent ${notice} allows a ${kind} meeting no earlier than ${earliest} (${r.amount} ${r.unit.replace('_', ' ')}, ${r.source})`);
    }
    return tx(db, async () => {
      const [m] = await db.query('insert into meetings (appointment_id, kind, notice_sent_on, meeting_on) values ($1,$2,$3,$4) returning *', [a.id, kind, notice, on]);
      await note(db, a.id, f.actor, 'call-meeting', `${kind} meeting on ${on}, notice sent ${notice}`);
      return m;
    });
  },
  // A meeting held. A first or second meeting also records its statutory step.
  async 'hold-meeting'(db, [term, kind], f) {
    need(f, 'actor', 'outcome');
    const a = await openAppointment(db, term);
    const rows = await db.query('select * from meetings where appointment_id = $1 and not held order by meeting_on', [a.id]);
    const m = choose(rows, kind, 'Meeting not yet held', (x) => [x.kind, x.meeting_on, x.id]);
    const on = f.date ? date(f.date, 'date') : m.meeting_on;
    if (on > today()) throw Error(`The ${m.kind} meeting is on ${on}: record it once it has been held`);
    return tx(db, async () => {
      await db.query('update meetings set held = true, meeting_on = $2, outcome = $3 where id = $1', [m.id, on, f.outcome]);
      const event = `${m.kind}_meeting`;
      const [rule] = await db.query('select 1 from deadline_rules where event = $1 and jurisdiction = $2 and $3 = any(kinds)', [event, a.jurisdiction, a.kind]);
      if (rule && !(await db.query('select 1 from events where appointment_id = $1 and event = $2', [a.id, event])).length) {
        await db.query('insert into events (appointment_id, event, done_on, reference) values ($1,$2,$3,$4)', [a.id, event, on, 'meeting minutes']);
      }
      await note(db, a.id, f.actor, 'hold-meeting', `${m.kind} meeting held ${on}: ${f.outcome}`);
      return { appointment: a.ref, meeting: m.kind, held_on: on, outcome: f.outcome };
    });
  },
  // Notice of intention to declare a dividend: fixes the last day for proofs in one class.
  async 'notice-dividend'(db, [term], f) {
    need(f, 'actor', 'class', 'close');
    const a = await openAppointment(db, term);
    const cls = oneOf(f.class, CLASSES, 'class');
    const notice = dateOr(f.date, 'date');
    const close = date(f.close, 'close');
    const r = await periodRule(db, a.jurisdiction, 'dividend_proofs_min');
    if (r) {
      const earliest = await addDays(db, notice, r.unit, r.amount, a.jurisdiction);
      if (close < earliest) throw Error(`The last day for proofs must be ${earliest} or later (${r.amount} ${r.unit.replace('_', ' ')} after the notice, ${r.source})`);
    } else if (close < notice) throw Error('The last day for proofs cannot be before the notice');
    return tx(db, async () => {
      if ((await db.query('select 1 from dividends where appointment_id = $1 and class = $2 and declared_on is null', [a.id, cls])).length) throw Error(`${a.ref} already has an open ${cls} dividend notice`);
      const [d] = await db.query('insert into dividends (appointment_id, class, notice_on, proofs_close_on) values ($1,$2,$3,$4) returning *', [a.id, cls, notice, close]);
      await note(db, a.id, f.actor, 'notice-dividend', `${cls} dividend: notice ${notice}, proofs close ${close}`);
      return d;
    });
  },
  // Declare and pay a dividend to one class, pro rata to what is still owed on each admitted proof.
  // Refuses before proofs close, with proofs still undecided, with a higher class unpaid, or without the cash.
  async 'declare-dividend'(db, [term], f) {
    need(f, 'actor', 'class', 'amount');
    const a = await openAppointment(db, term);
    const cls = oneOf(f.class, CLASSES, 'class');
    const pool = cents(f.amount, 'amount');
    const on = dateOr(f.date, 'date');
    if (pool === 0) throw Error('--amount must be more than zero');
    return tx(db, async () => {
      const [d] = await db.query('select * from dividends where appointment_id = $1 and class = $2 and declared_on is null', [a.id, cls]);
      if (!d) throw Error(`No open ${cls} dividend notice for ${a.ref}: give notice first (notice-dividend)`);
      if (on <= d.proofs_close_on) throw Error(`Proofs close ${d.proofs_close_on}: declare after that date`);
      const open = await db.query(`select c.name from proofs p join creditors c on c.id = p.creditor_id where p.appointment_id = $1 and p.class = $2 and p.status = 'lodged'`, [a.id, cls]);
      if (open.length) throw Error(`Admit or reject every ${cls} proof first: ${open.map((r) => r.name).join(', ')}`);
      const ahead = await db.query(`select class, admitted_cents - paid_cents as short_cents from v_classes where appointment_id = $1 and rank < $2 and admitted_cents > paid_cents`, [a.id, RANK[cls]]);
      if (ahead.length) throw Error(`Higher classes are not paid in full: ${ahead.map((r) => `${r.class} short ${money(r.short_cents, a.currency)}`).join('; ')}`);
      const proofs = await db.query(`select p.id, p.creditor_id, c.name, p.admitted_cents - coalesce((select sum(l.amount_cents) from ledger l where l.proof_id = p.id and l.kind = 'dividend'), 0) as owed
        from proofs p join creditors c on c.id = p.creditor_id where p.appointment_id = $1 and p.class = $2 and p.status in ('admitted','partly_admitted') order by c.name`, [a.id, cls]);
      const owed = proofs.reduce((s, p) => s + Number(p.owed), 0);
      if (!owed) throw Error(`No admitted ${cls} claims are owed anything`);
      if (pool > owed) throw Error(`${money(pool, a.currency)} is more than the ${money(owed, a.currency)} still owed to the ${cls} class`);
      await needCash(db, a, pool);
      // Largest remainder: every cent of the pool is paid, nobody gets more than their share rounded up.
      const shares = proofs.filter((p) => Number(p.owed) > 0).map((p) => { const exact = (pool * Number(p.owed)) / owed; return { ...p, pay: Math.floor(exact), frac: exact - Math.floor(exact) }; });
      let left = pool - shares.reduce((s, p) => s + p.pay, 0);
      for (const p of [...shares].sort((x, y) => y.frac - x.frac || x.name.localeCompare(y.name))) { if (!left) break; p.pay++; left--; }
      const rate = Math.round((10000 * pool) / owed) / 100;
      await db.query('update dividends set declared_on = $2, pool_cents = $3, cents_in_dollar = $4 where id = $1', [d.id, on, pool, rate]);
      for (const p of shares) {
        if (!p.pay) continue;
        await db.query(`insert into ledger (appointment_id, occurred_on, kind, category, description, amount_cents, creditor_id, proof_id, dividend_id, payee)
          values ($1,$2,'dividend','dividend',$3,$4,$5,$6,$7,$8)`, [a.id, on, `${cls} dividend ${rate}c in the dollar`, p.pay, p.creditor_id, p.id, d.id, p.name]);
      }
      await note(db, a.id, f.actor, 'declare-dividend', `${cls}: ${money(pool, a.currency)} to ${shares.length} creditor(s), ${rate} cents in the dollar`);
      return shares.map((p) => ({ creditor: p.name, owed_cents: Number(p.owed), paid_cents: p.pay, currency: a.currency, cents_in_dollar: rate }));
    });
  },
  async 'add-task'(db, [term], f) {
    need(f, 'actor', 'title');
    const a = await openAppointment(db, term);
    return tx(db, async () => {
      const [t] = await db.query('insert into tasks (appointment_id, title, owner, due_on) values ($1,$2,$3,$4) returning *',
        [a.id, f.title, f.owner || a.manager, f.due ? date(f.due, 'due') : null]);
      await note(db, a.id, f.actor, 'add-task', `${t.title}${t.due_on ? ` due ${t.due_on}` : ''}`);
      return t;
    });
  },
  async done(db, [term, what], f) {
    need(f, 'actor');
    const a = await appointment(db, term);
    const rows = await db.query('select * from tasks where appointment_id = $1 and done_on is null', [a.id]);
    const t = choose(rows, what, 'Open task', (r) => [r.title, r.id]);
    return tx(db, async () => {
      await db.query('update tasks set done_on = $2 where id = $1', [t.id, today()]);
      await note(db, a.id, f.actor, 'done', t.title);
      return { appointment: a.ref, task: t.title, done_on: today() };
    });
  },
  async log(db, [term], f) {
    need(f, 'actor', 'note');
    const a = await appointment(db, term);
    await note(db, a.id, f.actor, 'note', f.note);
    return { appointment: a.ref, noted: f.note };
  },
  // Close the file. Refuses with cash held, assets unrealised, proofs undecided, open tasks,
  // overdue steps or remuneration over approval. Records the final return reference.
  async close(db, [term], f) {
    need(f, 'actor', 'reference');
    const a = await openAppointment(db, term);
    const [p] = await db.query('select * from v_position where appointment_id = $1', [a.id]);
    const [r] = await db.query('select * from v_remuneration where appointment_id = $1', [a.id]);
    const problems = [];
    if (Number(p.cash_held_cents) !== 0) problems.push(`cash held ${money(p.cash_held_cents, a.currency)}`);
    if (p.assets_to_realise > 0) problems.push(`${p.assets_to_realise} asset(s) not realised or abandoned`);
    if (p.proofs_to_adjudicate > 0) problems.push(`${p.proofs_to_adjudicate} proof(s) not admitted or rejected`);
    if (a.jurisdiction === 'AU' && Number(r.drawn_cents) > Number(r.approved_cents)) problems.push('remuneration drawn above approval');
    const [{ overdue }] = await db.query(`select count(*)::int as overdue from v_deadlines where appointment_id = $1 and state = 'overdue'`, [a.id]);
    if (overdue) problems.push(`${overdue} statutory step(s) overdue`);
    const [{ open }] = await db.query('select count(*)::int as open from tasks where appointment_id = $1 and done_on is null', [a.id]);
    if (open) problems.push(`${open} open task(s)`);
    if (problems.length) throw Error(`${a.ref} cannot close: ${problems.join('; ')}`);
    return tx(db, async () => {
      await db.query(`insert into events (appointment_id, event, done_on, reference) values ($1,'final_return',$2,$3)`, [a.id, today(), f.reference]);
      await db.query(`update appointments set status = 'closed', closed_on = $2 where id = $1`, [a.id, today()]);
      await note(db, a.id, f.actor, 'close', `File closed. Final return: ${f.reference}`);
      return { appointment: a.ref, status: 'closed', final_return: f.reference };
    });
  },
};

async function history(db, [term]) {
  const a = await appointment(db, term);
  const [p] = await db.query('select * from v_position where appointment_id = $1', [a.id]);
  const [r] = await db.query('select * from v_remuneration where appointment_id = $1', [a.id]);
  return {
    appointment: a, position: p, remuneration: r,
    deadlines: await db.query('select step, due_on, state, done_on from v_deadlines where appointment_id = $1 order by due_on', [a.id]),
    classes: await db.query('select class, admitted_proofs, lodged_proofs, admitted_cents, paid_cents from v_classes where appointment_id = $1 order by rank', [a.id]),
    assets: await db.query('select description, kind, status, estimated_cents, realised_cents from assets where appointment_id = $1 order by description', [a.id]),
    meetings: await db.query('select kind, notice_sent_on, meeting_on, held, outcome from meetings where appointment_id = $1 order by meeting_on', [a.id]),
    activity: await db.query('select at, actor, action, detail from activity where appointment_id = $1 order by at desc, id desc limit 50', [a.id]),
  };
}

// ------------------------------------------------------------------ import and export

// Turnkey IPS does not publish its export layout. Run the creditor listing for the case, export it to
// Excel, save as CSV. Headings vary by report and version, so a column map can rename them.
const DEFAULT_MAP = {
  name: ['Creditor Name', 'Creditor', 'Name', 'Payee'],
  kind: ['Creditor Type', 'Type', 'Category', 'Class'],
  contact: ['Email', 'Email Address', 'Contact', 'Contact Email'],
  per_records: ['Amount per Records', 'Per Records', 'RATA Amount', 'ROCAP Amount', 'Book Value', 'Estimated Amount', 'Amount Owed'],
  claimed: ['Amount Claimed', 'Claim Amount', 'POD Amount', 'Proof Amount'],
  admitted: ['Amount Admitted', 'Admitted Amount', 'Admitted'],
  status: ['POD Status', 'Proof Status', 'Claim Status', 'Status'],
  lodged: ['Date Received', 'POD Received', 'Date Lodged', 'Lodged'],
  class: ['Priority', 'Priority Class', 'Dividend Class'],
};
const KIND_WORDS = [[/employ|staff|wage/i, 'employee'], [/\bato\b|\bird\b|tax|revenue|inland/i, 'tax_authority'], [/secur|ppsr|ppsa|charge/i, 'secured'], [/relat|director|shareholder/i, 'related_party'], [/trade|supplier|unsecured/i, 'trade']];
const mapKind = (v) => { for (const [re, k] of KIND_WORDS) if (re.test(v)) return k; return 'other'; };
const STATUS_WORDS = [[/part/i, 'partly_admitted'], [/admit|accept/i, 'admitted'], [/reject/i, 'rejected'], [/withdr/i, 'withdrawn'], [/./, 'lodged']];
const mapStatus = (v) => { for (const [re, s] of STATUS_WORDS) if (re.test(v)) return s; return 'lodged'; };
const CLASS_WORDS = [[/redund|retrench/i, 'employee_redundancy'], [/leave|holiday|annual/i, 'employee_leave'], [/wage|salary|super/i, 'employee_wages'], [/tax|gst|paye/i, 'tax_preferential']];
const mapClass = (v, kind, juris) => { for (const [re, c] of CLASS_WORDS) if (re.test(v)) return c === 'tax_preferential' && juris !== 'NZ' ? 'unsecured' : c; return kind === 'employee' ? 'employee_wages' : 'unsecured'; };
// "dd/mm/yyyy" (the AU and NZ export default) or ISO.
function csvDate(v, row) {
  const s = String(v || '').trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return date(m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s, `lodged date on row ${row}`);
}

async function importIps(db, file, f) {
  need(f, 'actor', 'appointment');
  if (!file) throw Error('Give the path to the CSV saved from the Turnkey IPS creditor listing');
  const a = await openAppointment(db, f.appointment);
  const map = { ...DEFAULT_MAP };
  if (f.map) for (const [k, v] of Object.entries(JSON.parse(readFileSync(path.resolve(f.map), 'utf8')))) map[k] = Array.isArray(v) ? v : [v];
  const rows = parseCsv(readFileSync(path.resolve(file), 'utf8'));
  const prepared = rows.map((r, i) => {
    const name = pick(r, ...map.name).trim();
    if (!name) throw Error(`Row ${i + 2}: no creditor name`);
    const kind = mapKind(pick(r, ...map.kind));
    const rec = pick(r, ...map.per_records).trim();
    const claimed = pick(r, ...map.claimed).trim();
    const admitted = pick(r, ...map.admitted).trim();
    const status = claimed ? mapStatus(pick(r, ...map.status)) : null;
    const p = {
      name, kind, contact: pick(r, ...map.contact).trim(), per_records: rec === '' ? null : cents(rec, `records amount on row ${i + 2}`),
      claimed: claimed === '' ? null : cents(claimed, `claimed amount on row ${i + 2}`), status, source: r,
      admitted: admitted === '' ? 0 : cents(admitted, `admitted amount on row ${i + 2}`),
      lodged: csvDate(pick(r, ...map.lodged), i + 2) || a.appointed_on, class: mapClass(pick(r, ...map.class), kind, a.jurisdiction),
    };
    if (p.status === 'admitted' && !p.admitted) p.admitted = p.claimed;
    if (p.claimed !== null && p.admitted > p.claimed) throw Error(`Row ${i + 2}: admitted is more than claimed`);
    if (p.claimed !== null && p.claimed === 0) throw Error(`Row ${i + 2}: a proof for zero`);
    return p;
  });
  // One row per claim: a creditor with a wages claim and a leave claim appears twice, once per class.
  const seen = new Set();
  for (const p of prepared) { const k = `${p.name.toLowerCase()}|${p.class}`; if (seen.has(k)) throw Error(`Duplicate row in file: ${p.name} (${p.class})`); seen.add(k); }
  const totals = new Map();
  for (const p of prepared) { const k = p.name.toLowerCase(); if (p.per_records !== null) totals.set(k, (totals.get(k) || 0) + p.per_records); else if (!totals.has(k)) totals.set(k, null); }
  let added = 0, skipped = 0, proofs = 0;
  const made = new Map();
  await db.exec('begin');
  try {
    for (const p of prepared) {
      const key = p.name.toLowerCase();
      let id = made.get(key);
      if (id === 'skip') { skipped++; continue; }
      if (!id) {
        const [existing] = await db.query('select * from creditors where appointment_id = $1 and lower(name) = lower($2)', [a.id, p.name]);
        if (existing) {
          const same = (existing.per_records_cents === null ? null : Number(existing.per_records_cents)) === totals.get(key);
          if (!same) throw Error(`Import conflict: ${p.name} already exists with a different amount. Nothing imported.`);
          made.set(key, 'skip');
          skipped++;
          continue;
        }
        const [c] = await db.query(`insert into creditors (appointment_id, name, kind, contact, per_records_cents, is_related, source) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
          [a.id, p.name, p.kind, p.contact, p.per_records, p.kind === 'related_party', JSON.stringify(p.source)]);
        id = c.id;
        made.set(key, id);
        added++;
      } else if (p.per_records !== null) {
        await db.query('update creditors set per_records_cents = coalesce(per_records_cents, 0) + $2 where id = $1', [id, p.per_records]);
      }
      if (p.claimed !== null && p.status !== 'withdrawn') {
        await db.query(`insert into proofs (appointment_id, creditor_id, lodged_on, class, claimed_cents, status, admitted_cents, adjudicated_on, reason)
          values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [a.id, id, p.lodged, p.class, p.claimed, p.status, p.status === 'rejected' ? 0 : p.status === 'lodged' ? 0 : p.admitted,
          p.status === 'lodged' ? null : p.lodged, p.status === 'lodged' ? '' : 'Imported from Turnkey IPS']);
        proofs++;
      }
    }
    await note(db, a.id, f.actor, 'import', `Turnkey IPS creditor listing: ${added} added, ${proofs} proofs, ${skipped} already there${f['dry-run'] ? ' (dry run)' : ''}`);
    await db.exec(f['dry-run'] ? 'rollback' : 'commit');
  } catch (err) { await db.exec('rollback'); throw err; }
  return { appointment: a.ref, added, proofs, skipped, dry_run: Boolean(f['dry-run']) };
}

const EXPORT_TABLES = ['appointments', 'creditors', 'proofs', 'assets', 'dividends', 'ledger', 'remuneration_approvals', 'time_entries', 'meetings', 'events', 'tasks', 'activity', 'holidays', 'deadline_rules', 'period_rules'];
async function exportAll(db, f) {
  const out = {};
  for (const t of EXPORT_TABLES) out[t] = await db.query(`select * from ${t} order by 1`);
  if (f.out) { writeFileSync(path.resolve(f.out), JSON.stringify(out, null, 2), { flag: 'wx', mode: 0o600 }); return { written: path.resolve(f.out) }; }
  return out;
}

// ------------------------------------------------------------------ drafts (never sent)

function draft(name, body) {
  const dir = path.resolve(process.env.OUTPUT_DIR || REPO_ROOT, 'drafts');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  let file = path.join(dir, `${today()}-${name}.md`);
  for (let i = 2; existsSync(file); i++) file = path.join(dir, `${today()}-${name}-${i}.md`);
  writeFileSync(file, `${body.trim()}\n\nDraft only. Nothing sent.\n`, { mode: 0o600 });
  return file;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-');
const tableMd = (rows) => (rows.length ? [`| ${Object.keys(rows[0]).join(' | ')} |`, `|${Object.keys(rows[0]).map(() => '---').join('|')}|`, ...rows.map((r) => `| ${Object.values(r).map((v) => String(v ?? '')).join(' | ')} |`)].join('\n') : '_None._');
const ROLE = { creditors_voluntary_liquidation: 'liquidator', court_liquidation: 'liquidator', voluntary_administration: 'administrator' };

const drafts = {
  async 'draft-creditor-update'(db, [term]) {
    const a = await appointment(db, term);
    const [p] = await db.query('select * from v_position where appointment_id = $1', [a.id]);
    const left = await db.query(`select description, kind from assets where appointment_id = $1 and status = 'to_realise' order by description`, [a.id]);
    const classes = await db.query('select class, admitted_cents, paid_cents from v_classes where appointment_id = $1 order by rank', [a.id]);
    const next = await db.query(`select step, due_on from v_deadlines where appointment_id = $1 and done_on is null order by due_on limit 3`, [a.id]);
    const file = draft(slug(`${a.ref}-creditor-update`), `
# ${a.company_name}${a.company_number ? ` (${a.company_number})` : ''}: update to creditors

${a.practitioner} was appointed ${ROLE[a.kind]} on ${a.appointed_on}. Our reference ${a.ref}.

## Realisations so far
Received: ${money(p.receipts_cents, a.currency)}. Paid in costs: ${money(p.payments_cents, a.currency)}. Paid in dividends: ${money(p.dividends_cents, a.currency)}. Held now: ${money(p.cash_held_cents, a.currency)}.

Still to realise:
${left.length ? left.map((x) => `- ${x.description} (${x.kind.replace('_', ' ')})`).join('\n') : '- Nothing.'}

## Claims
${tableMd(classes.map((c) => ({ class: c.class.replace(/_/g, ' '), admitted: money(c.admitted_cents, a.currency), paid: money(c.paid_cents, a.currency) })))}

## What happens next
${next.length ? next.map((d) => `- ${d.step}: by ${d.due_on}`).join('\n') : '- [next step]'}

If you have not lodged a proof of debt, [how to lodge].

${a.practitioner}
${ROLE[a.kind][0].toUpperCase() + ROLE[a.kind].slice(1)}`);
    return { file };
  },
  async 'draft-dividend-notice'(db, [term], f) {
    need(f, 'class');
    const a = await appointment(db, term);
    const cls = oneOf(f.class, CLASSES, 'class');
    const [d] = await db.query('select * from dividends where appointment_id = $1 and class = $2 order by notice_on desc limit 1', [a.id, cls]);
    if (!d) throw Error(`No ${cls} dividend notice recorded for ${a.ref}: record it first (notice-dividend)`);
    const file = draft(slug(`${a.ref}-${cls}-dividend-notice`), `
# ${a.company_name}: notice of intention to declare a dividend

Class: ${cls.replace(/_/g, ' ')}. Our reference ${a.ref}.

The ${ROLE[a.kind]} intends to declare a dividend to ${cls.replace(/_/g, ' ')} creditors. Creditors who have not yet lodged a proof of debt must lodge it by **${d.proofs_close_on}**. A proof lodged after that date may be excluded from this dividend.

${d.declared_on ? `Declared ${d.declared_on}: ${d.cents_in_dollar} cents in the dollar.` : 'The dividend will be declared after the last day for proofs, once every proof received has been admitted or rejected.'}

${a.practitioner}`);
    return { file };
  },
  async 'draft-rejection-notice'(db, [term, who]) {
    const a = await appointment(db, term);
    const c = await creditor(db, a, who);
    const [p] = await db.query(`select * from proofs where creditor_id = $1 and status in ('rejected','partly_admitted') order by adjudicated_on desc limit 1`, [c.id]);
    if (!p) throw Error(`${c.name} has no rejected or part-admitted proof`);
    const file = draft(slug(`${a.ref}-${c.name}-proof-notice`), `
# ${a.company_name}: notice about your proof of debt

To ${c.name}${c.contact ? ` (${c.contact})` : ''}. Our reference ${a.ref}.

Your proof lodged on ${p.lodged_on} claimed ${money(p.claimed_cents, a.currency)}. On ${p.adjudicated_on} it was ${p.status === 'rejected' ? 'rejected in full' : `admitted for ${money(p.admitted_cents, a.currency)} and rejected for the balance of ${money(Number(p.claimed_cents) - Number(p.admitted_cents), a.currency)}`}.

Reason: ${p.reason}

You may apply to the court to have this decision reviewed within the time the law allows: [period and rule from docs/compliance.md, confirmed by the practitioner].

${a.practitioner}`);
    return { file };
  },
  async 'weekly-review'(db) {
    const attention = await reads.attention(db);
    const deadlines = await reads.deadlines(db, [], { days: 14 });
    const position = await reads.position(db, [], {});
    const file = draft('weekly-review', `
# Monday files review, ${today()}

## Needs attention
${tableMd(attention)}

## Statutory steps, next 14 days
${tableMd(deadlines.map(({ source, ...r }) => r))}

## Money held
${tableMd(position.map((r) => ({ ref: r.ref, company: r.company, held: money(r.cash_held_cents, r.currency), to_realise: r.to_realise })))}`);
    return { file, attention: attention.length, steps: deadlines.length };
  },
};

// ------------------------------------------------------------------ dispatch

export const commands = [...Object.keys(reads), 'history', ...Object.keys(writes), 'import', 'export', ...Object.keys(drafts)];

export async function run(db, command, args = [], flags = {}) {
  if (reads[command]) return reads[command](db, args, flags);
  if (command === 'history') return history(db, args);
  if (writes[command]) return writes[command](db, args, flags);
  if (drafts[command]) return drafts[command](db, args, flags);
  if (command === 'import') {
    if (String(args[0]).toLowerCase() !== 'ips') throw Error('Usage: import ips <file.csv> --appointment=<ref> --actor=<name> [--map=<map.json>] [--dry-run]');
    return importIps(db, args[1], flags);
  }
  if (command === 'export') return exportAll(db, flags);
  throw Error(`Unknown command "${command}". Run with --help.`);
}

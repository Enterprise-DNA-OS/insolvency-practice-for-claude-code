-- Insolvency practice: the records a liquidator or administrator keeps from appointment to final return.
-- Portable Postgres: runs on any Postgres 15+ and on the embedded PGlite. No extensions.
-- Money is stored in cents (bigint) in the appointment's currency. Dates are calendar dates (UTC).

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ------------------------------------------------------------------ appointments

create table appointments (
  id uuid primary key default gen_random_uuid(),
  ref text not null,
  company_name text not null,
  company_number text not null default '',
  jurisdiction text not null default 'AU' check (jurisdiction in ('AU','NZ')),
  kind text not null
    check (kind in ('creditors_voluntary_liquidation','court_liquidation','voluntary_administration')),
  appointed_on date not null,
  practitioner text not null,
  practitioner_licence text not null default '',
  manager text not null default 'Unassigned',
  convening_extended boolean not null default false,
  status text not null default 'open' check (status in ('open','closed')),
  currency text not null default 'AUD' check (currency ~ '^[A-Z]{3}$'),
  notes text not null default '',
  closed_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closed_on is null or closed_on >= appointed_on)
);
create unique index appointments_ref_key on appointments (lower(ref));
create trigger appointments_touch before update on appointments for each row execute function touch_updated_at();

create table creditors (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  name text not null,
  kind text not null default 'trade'
    check (kind in ('trade','employee','tax_authority','secured','related_party','other')),
  contact text not null default '',
  -- What the company's own records or the directors' report said was owed.
  per_records_cents bigint check (per_records_cents is null or per_records_cents >= 0),
  is_related boolean not null default false,
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index creditors_name_key on creditors (appointment_id, lower(name));
create trigger creditors_touch before update on creditors for each row execute function touch_updated_at();

-- Proofs of debt (AU) and claims (NZ). One row per proof lodged.
-- class ranks the claim for dividends: lower rank is paid in full before the next.
create table proofs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  creditor_id uuid not null references creditors(id),
  lodged_on date not null,
  class text not null default 'unsecured'
    check (class in ('employee_wages','employee_leave','employee_redundancy','tax_preferential','unsecured')),
  claimed_cents bigint not null check (claimed_cents > 0),
  status text not null default 'lodged'
    check (status in ('lodged','admitted','partly_admitted','rejected','withdrawn')),
  admitted_cents bigint not null default 0 check (admitted_cents >= 0),
  adjudicated_on date,
  reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (admitted_cents <= claimed_cents),
  check (status <> 'rejected' or admitted_cents = 0),
  check (adjudicated_on is null or adjudicated_on >= lodged_on)
);
create trigger proofs_touch before update on proofs for each row execute function touch_updated_at();

create table assets (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  description text not null,
  kind text not null default 'other'
    check (kind in ('cash_at_bank','debtors','plant','stock','vehicle','property','recovery_claim','other')),
  -- Estimated realisable value in the directors' report or the practitioner's first estimate.
  estimated_cents bigint check (estimated_cents is null or estimated_cents >= 0),
  status text not null default 'to_realise' check (status in ('to_realise','realised','abandoned')),
  realised_cents bigint not null default 0 check (realised_cents >= 0),
  realised_on date,
  secured_to uuid references creditors(id),
  notes text not null default '',
  source jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger assets_touch before update on assets for each row execute function touch_updated_at();

create table dividends (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  class text not null
    check (class in ('employee_wages','employee_leave','employee_redundancy','tax_preferential','unsecured')),
  notice_on date not null,
  proofs_close_on date not null,
  declared_on date,
  pool_cents bigint check (pool_cents is null or pool_cents > 0),
  cents_in_dollar numeric(7,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (proofs_close_on >= notice_on),
  check (declared_on is null or declared_on >= proofs_close_on)
);
create trigger dividends_touch before update on dividends for each row execute function touch_updated_at();

-- The cashbook. Receipts in, payments out, dividends out. One bank account per appointment.
create table ledger (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  occurred_on date not null,
  kind text not null check (kind in ('receipt','payment','dividend')),
  category text not null default 'other'
    check (category in ('realisation','remuneration','legal','agent','trading','tax','other','dividend')),
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  asset_id uuid references assets(id),
  creditor_id uuid references creditors(id),
  proof_id uuid references proofs(id),
  dividend_id uuid references dividends(id),
  payee text not null default '',
  created_at timestamptz not null default now(),
  check (kind <> 'dividend' or (proof_id is not null and dividend_id is not null))
);

-- Remuneration approved by creditors, the committee or the court.
create table remuneration_approvals (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  approved_on date not null,
  approved_by text not null check (approved_by in ('creditors','committee','court')),
  amount_cents bigint not null check (amount_cents > 0),
  period text not null default '',
  created_at timestamptz not null default now()
);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  worked_on date not null,
  staff text not null,
  task text not null default 'administration'
    check (task in ('assets','creditors','employees','investigation','dividend','administration','trade_on')),
  minutes integer not null check (minutes > 0 and minutes <= 10080),
  rate_cents bigint not null check (rate_cents >= 0),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  kind text not null check (kind in ('first','second','creditors','committee','other')),
  notice_sent_on date not null,
  meeting_on date not null,
  held boolean not null default false,
  outcome text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (meeting_on >= notice_sent_on)
);
create trigger meetings_touch before update on meetings for each row execute function touch_updated_at();

-- Statutory steps done: a notice sent, a report issued, a return lodged. period_no counts
-- repeating steps (the second annual return is period 2).
create table events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  event text not null,
  period_no integer not null default 1 check (period_no >= 1),
  done_on date not null,
  reference text not null default '',
  created_at timestamptz not null default now()
);
create unique index events_once on events (appointment_id, event, period_no);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id),
  title text not null,
  owner text not null,
  due_on date,
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger tasks_touch before update on tasks for each row execute function touch_updated_at();

create table activity (
  id bigint generated always as identity primary key,
  appointment_id uuid references appointments(id),
  at timestamptz not null default now(),
  actor text not null check (length(trim(actor)) > 0),
  action text not null,
  detail text not null default ''
);
create or replace function activity_append_only() returns trigger language plpgsql as $$
begin
  raise exception 'Append-only: activity rows cannot be changed or removed';
end $$;
create trigger activity_no_update before update or delete on activity for each row execute function activity_append_only();

-- ------------------------------------------------------------------ the deadline engine

-- Public holidays the firm observes, per jurisdiction ('ALL' for both). Business and working
-- days skip weekends and these days. Add your state's holidays each year (see docs/compliance.md).
create table holidays (
  day date not null,
  jurisdiction text not null default 'ALL' check (jurisdiction in ('AU','NZ','ALL')),
  name text not null default '',
  primary key (day, jurisdiction)
);

-- One row per statutory step. due = base date + amount in unit. base 'appointed' counts from the
-- appointment; base 'period_end' counts from the end of each repeating period (repeat_months).
-- A rule you change here changes every deadline on the next query. Sources: docs/compliance.md.
create table deadline_rules (
  event text not null,
  jurisdiction text not null check (jurisdiction in ('AU','NZ')),
  kinds text[] not null,
  label text not null,
  unit text not null check (unit in ('business_days','working_days','days','months')),
  amount integer not null check (amount >= 0),
  amount_extended integer,
  base text not null default 'appointed' check (base in ('appointed','period_end')),
  repeat_months integer check (repeat_months is null or repeat_months > 0),
  source text not null,
  primary key (event, jurisdiction, kinds)
);

-- Notice periods and dividend windows: rule names notice_<meeting kind>, dividend_proofs_min
-- (shortest gap from a dividend notice to the last day for proofs) and adjudicate_within (time to
-- admit or reject proofs after that day).
create table period_rules (
  rule text not null,
  jurisdiction text not null check (jurisdiction in ('AU','NZ')),
  unit text not null check (unit in ('business_days','working_days','days','months')),
  amount integer not null check (amount >= 0),
  source text not null,
  primary key (rule, jurisdiction)
);

-- AU business day: not a weekend or a listed holiday (Corporations Act 2001 s 9). NZ working day
-- (Companies Act 1993 s 2): not a weekend, a listed holiday, a day from 25 December to 2 January,
-- or the Monday (and Tuesday) after a New Year's Day that falls on a Friday, Saturday or Sunday.
create or replace function is_working_day(d date, juris text) returns boolean language sql stable as $$
  select extract(isodow from d) < 6
    and not exists (select 1 from holidays h where h.day = d and h.jurisdiction in (juris, 'ALL'))
    and not (juris = 'NZ' and (
      (extract(month from d) = 12 and extract(day from d) >= 25)
      or (extract(month from d) = 1 and extract(day from d) <= 2)
      or (extract(month from d) = 1 and extract(day from d) = 3 and extract(isodow from make_date(extract(year from d)::int, 1, 1)) in (6,7))
      or (extract(month from d) = 1 and extract(day from d) = 4 and extract(isodow from make_date(extract(year from d)::int, 1, 1)) in (5,6))))
$$;

create or replace function add_working_days(start date, n integer, juris text) returns date language sql stable as $$
  select case when n <= 0 then start else (
    select x.d from (select (start + g)::date as d from generate_series(1, n * 3 + 45) g) x
    where is_working_day(x.d, juris)
    order by x.d offset n - 1 limit 1) end
$$;

create or replace function deadline_due(base date, unit text, amount integer, juris text) returns date language sql stable as $$
  select case unit
    when 'months' then (base + make_interval(months => amount))::date
    when 'days' then base + amount
    else add_working_days(base, amount, juris) end
$$;

-- Every statutory step for every open appointment: when it is due and whether it is done.
create view v_deadlines with (security_invoker = true) as
with occ as (
  select a.id as appointment_id, a.ref, a.company_name, a.jurisdiction, a.kind, a.manager, a.appointed_on, a.status,
    r.event, r.label, r.unit, r.base, r.repeat_months, r.source,
    case when a.convening_extended and r.amount_extended is not null then r.amount_extended else r.amount end as amount,
    g.n as period_no
  from appointments a
  join deadline_rules r on r.jurisdiction = a.jurisdiction and a.kind = any(r.kinds)
  cross join lateral generate_series(1, case when r.repeat_months is null then 1 else
    ((extract(year from age(current_date, a.appointed_on)) * 12 + extract(month from age(current_date, a.appointed_on)))::int / r.repeat_months) + 1 end) g(n)
  where a.status = 'open'
)
select o.appointment_id, o.ref, o.company_name, o.jurisdiction, o.kind, o.manager, o.event, o.period_no,
  o.label || case when o.repeat_months is null then '' else ' #' || o.period_no end as step,
  case when o.base = 'period_end' then (o.appointed_on + make_interval(months => o.repeat_months * o.period_no))::date end as period_ends,
  deadline_due(case when o.base = 'period_end' then (o.appointed_on + make_interval(months => o.repeat_months * o.period_no))::date
                    else o.appointed_on end, o.unit, o.amount, o.jurisdiction) as due_on,
  e.done_on, e.reference, o.source,
  case
    when e.done_on is not null and e.done_on <= deadline_due(case when o.base = 'period_end' then (o.appointed_on + make_interval(months => o.repeat_months * o.period_no))::date else o.appointed_on end, o.unit, o.amount, o.jurisdiction) then 'done'
    when e.done_on is not null then 'done late'
    when deadline_due(case when o.base = 'period_end' then (o.appointed_on + make_interval(months => o.repeat_months * o.period_no))::date else o.appointed_on end, o.unit, o.amount, o.jurisdiction) < current_date then 'overdue'
    when deadline_due(case when o.base = 'period_end' then (o.appointed_on + make_interval(months => o.repeat_months * o.period_no))::date else o.appointed_on end, o.unit, o.amount, o.jurisdiction) <= current_date + 7 then 'due this week'
    else 'upcoming'
  end as state
from occ o
left join events e on e.appointment_id = o.appointment_id and e.event = o.event and e.period_no = o.period_no;

-- ------------------------------------------------------------------ money views

create view v_position with (security_invoker = true) as
select a.id as appointment_id, a.ref, a.company_name, a.jurisdiction, a.kind, a.manager, a.status, a.currency,
  coalesce((select sum(x.estimated_cents) from assets x where x.appointment_id = a.id), 0) as estimated_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.appointment_id = a.id and l.kind = 'receipt'), 0) as receipts_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.appointment_id = a.id and l.kind = 'payment'), 0) as payments_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.appointment_id = a.id and l.kind = 'dividend'), 0) as dividends_cents,
  coalesce((select sum(case when l.kind = 'receipt' then l.amount_cents else -l.amount_cents end) from ledger l where l.appointment_id = a.id), 0) as cash_held_cents,
  (select count(*) from assets x where x.appointment_id = a.id and x.status = 'to_realise')::int as assets_to_realise,
  (select count(*) from proofs p where p.appointment_id = a.id and p.status = 'lodged')::int as proofs_to_adjudicate,
  (select max(x.at)::date from activity x where x.appointment_id = a.id) as last_activity_on
from appointments a;

create view v_remuneration with (security_invoker = true) as
select a.id as appointment_id, a.ref, a.company_name, a.jurisdiction, a.manager, a.status, a.currency,
  coalesce((select sum(r.amount_cents) from remuneration_approvals r where r.appointment_id = a.id), 0) as approved_cents,
  coalesce((select sum(l.amount_cents) from ledger l where l.appointment_id = a.id and l.kind = 'payment' and l.category = 'remuneration'), 0) as drawn_cents,
  coalesce((select sum(round(t.minutes * t.rate_cents / 60.0)) from time_entries t where t.appointment_id = a.id), 0)::bigint as time_cost_cents,
  coalesce((select sum(t.minutes) from time_entries t where t.appointment_id = a.id), 0)::int as minutes
from appointments a;

-- Admitted claims by class, with dividends paid so far, so the next dividend can be worked out.
create view v_classes with (security_invoker = true) as
select a.id as appointment_id, a.ref, a.currency, p.class,
  case p.class when 'employee_wages' then 1 when 'employee_leave' then 2 when 'employee_redundancy' then 3
    when 'tax_preferential' then 4 else 9 end as rank,
  count(*) filter (where p.status in ('admitted','partly_admitted'))::int as admitted_proofs,
  count(*) filter (where p.status = 'lodged')::int as lodged_proofs,
  coalesce(sum(p.admitted_cents) filter (where p.status in ('admitted','partly_admitted')), 0) as admitted_cents,
  coalesce((select sum(l.amount_cents) from ledger l join proofs q on q.id = l.proof_id
            where l.appointment_id = a.id and l.kind = 'dividend' and q.class = p.class), 0) as paid_cents
from appointments a join proofs p on p.appointment_id = a.id
group by a.id, a.ref, a.currency, p.class;

-- Everything that needs a person this week.
create view v_attention with (security_invoker = true) as
select d.ref, d.manager as owner, 'statutory step overdue' as item, d.step as detail, d.due_on as date, (current_date - d.due_on) as days
  from v_deadlines d where d.state = 'overdue'
union all
select d.ref, d.manager, 'statutory step due this week', d.step, d.due_on, (current_date - d.due_on)
  from v_deadlines d where d.state = 'due this week'
union all
select a.ref, a.manager, 'meeting coming up', m.kind || ' meeting', m.meeting_on, (current_date - m.meeting_on)
  from meetings m join appointments a on a.id = m.appointment_id
  where not m.held and m.meeting_on between current_date and current_date + 7 and a.status = 'open'
union all
select a.ref, a.manager, 'task overdue', t.title, t.due_on, (current_date - t.due_on)
  from tasks t join appointments a on a.id = t.appointment_id
  where t.done_on is null and t.due_on < current_date and a.status = 'open'
union all
select a.ref, a.manager, 'proof waiting on adjudication', c.name || ' (' || p.class || ')', d.proofs_close_on, (current_date - d.proofs_close_on)
  from proofs p join creditors c on c.id = p.creditor_id join appointments a on a.id = p.appointment_id
  join dividends d on d.appointment_id = p.appointment_id and d.class = p.class and d.declared_on is null
  where p.status = 'lodged' and d.proofs_close_on < current_date and a.status = 'open'
union all
select a.ref, a.manager, 'asset not realised', x.description, a.appointed_on, (current_date - a.appointed_on)
  from assets x join appointments a on a.id = x.appointment_id
  where x.status = 'to_realise' and current_date - a.appointed_on > 90 and a.status = 'open'
union all
select r.ref, r.manager, 'remuneration over approval', 'drawn more than approved', null::date, null::integer
  from v_remuneration r where r.status = 'open' and r.jurisdiction = 'AU' and r.drawn_cents > r.approved_cents
union all
select p.ref, p.manager, 'quiet file', 'no activity recorded', p.last_activity_on, (current_date - p.last_activity_on)
  from v_position p where p.status = 'open' and p.last_activity_on is not null and current_date - p.last_activity_on > 30;

-- ------------------------------------------------------------------ access

do $$
declare t text;
begin
  foreach t in array array['appointments','creditors','proofs','assets','dividends','ledger','remuneration_approvals',
                           'time_entries','meetings','events','tasks','activity','holidays','deadline_rules','period_rules'] loop
    execute format('alter table %I enable row level security', t);
    execute format('revoke all on %I from public', t);
  end loop;
end $$;
revoke all on v_deadlines, v_position, v_remuneration, v_classes, v_attention from public;

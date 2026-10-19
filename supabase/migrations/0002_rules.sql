-- The statutory steps and periods the desk tracks. One row per rule, each with its source.
-- Checked 2026-10-19 against: Corporations Act 2001 (compilation 9 July 2025), Insolvency Practice
-- Schedule (Corporations), Insolvency Practice Rules (Corporations) 2016, Corporations Regulations 2001
-- (19 December 2025), Companies Act 1993 (NZ). Full notes and links: docs/compliance.md.
-- Change a rule here (or ask /customise) and every deadline moves on the next query.

insert into deadline_rules (event, jurisdiction, kinds, label, unit, amount, amount_extended, base, repeat_months, source) values
 -- Australia: creditors' voluntary liquidation and court liquidation
 ('dirri', 'AU', array['creditors_voluntary_liquidation'], 'Independence declaration (DIRRI) to creditors', 'business_days', 10, null, 'appointed', null,
   'Corporations Act 2001 s 506A(2)'),
 ('initial_notice', 'AU', array['creditors_voluntary_liquidation'], 'Initial information and remuneration notice to creditors', 'business_days', 10, null, 'appointed', null,
   'Insolvency Practice Rules (Corporations) 2016 r 70-30(3), r 70-35(5)'),
 ('initial_notice', 'AU', array['court_liquidation'], 'Initial information and remuneration notice to creditors', 'business_days', 20, null, 'appointed', null,
   'Insolvency Practice Rules (Corporations) 2016 r 70-30(3), r 70-35(5)'),
 ('report_to_creditors', 'AU', array['creditors_voluntary_liquidation','court_liquidation'], 'Report to creditors (and Form 5601 to ASIC)', 'months', 3, null, 'appointed', null,
   'Insolvency Practice Rules (Corporations) 2016 r 70-40(3)'),
 -- Australia: voluntary administration
 ('first_meeting_notice', 'AU', array['voluntary_administration'], 'First meeting notice, DIRRI and initial information sent', 'business_days', 3, null, 'appointed', null,
   'Corporations Act 2001 s 436E(2)-(3) and s 436DA(3): notice at least 5 business days before a meeting held within 8'),
 ('first_meeting', 'AU', array['voluntary_administration'], 'First creditors'' meeting held', 'business_days', 8, null, 'appointed', null,
   'Corporations Act 2001 s 436E(2)'),
 ('second_meeting', 'AU', array['voluntary_administration'], 'Second creditors'' meeting held (last day of the window)', 'business_days', 25, 30, 'appointed', null,
   'Corporations Act 2001 s 439A(2), (5): convening period 20 business days (25 over December or Easter), meeting within 5 business days of its end'),
 -- Australia: every external administration
 ('annual_return', 'AU', array['creditors_voluntary_liquidation','court_liquidation','voluntary_administration'], 'Annual administration return (Form 5602)', 'months', 3, null, 'period_end', 12,
   'Insolvency Practice Schedule (Corporations) s 70-5'),
 -- New Zealand: liquidation
 ('initial_report', 'NZ', array['creditors_voluntary_liquidation'], 'First report to creditors, shareholders and the Registrar', 'working_days', 5, null, 'appointed', null,
   'Companies Act 1993 s 255(2)(c)'),
 ('initial_report', 'NZ', array['court_liquidation'], 'First report to creditors, shareholders and the Registrar', 'working_days', 25, null, 'appointed', null,
   'Companies Act 1993 s 255(2)(c)'),
 ('creditors_meeting', 'NZ', array['creditors_voluntary_liquidation'], 'Creditors'' meeting held (or s 245 notice given instead)', 'working_days', 10, null, 'appointed', null,
   'Companies Act 1993 s 243, s 245'),
 ('creditors_meeting', 'NZ', array['court_liquidation'], 'Creditors'' meeting held (or s 245 notice given instead)', 'working_days', 30, null, 'appointed', null,
   'Companies Act 1993 s 243, s 245'),
 ('six_monthly_report', 'NZ', array['creditors_voluntary_liquidation','court_liquidation'], 'Six-monthly report', 'working_days', 20, null, 'period_end', 6,
   'Companies Act 1993 s 255(2)(d)'),
 -- New Zealand: voluntary administration
 ('first_meeting', 'NZ', array['voluntary_administration'], 'First creditors'' meeting held', 'working_days', 8, null, 'appointed', null,
   'Companies Act 1993 s 239AN(2)'),
 ('second_meeting', 'NZ', array['voluntary_administration'], 'Watershed meeting held (last day)', 'working_days', 25, null, 'appointed', null,
   'Companies Act 1993 s 239AT(2) and s 239AV: convening period 20 working days, meeting within 5 working days after it ends')
on conflict do nothing;

insert into period_rules (rule, jurisdiction, unit, amount, source) values
 ('notice_first', 'AU', 'business_days', 5, 'Corporations Act 2001 s 436E(3)'),
 ('notice_second', 'AU', 'business_days', 5, 'Insolvency Practice Rules (Corporations) 2016 r 75-225(2)(a)'),
 ('notice_creditors', 'AU', 'business_days', 10, 'Insolvency Practice Rules (Corporations) 2016 r 75-40(3)'),
 ('dividend_proofs_min', 'AU', 'days', 21, 'Corporations Regulations 2001 reg 5.6.65(2)'),
 ('adjudicate_within', 'AU', 'days', 14, 'Corporations Regulations 2001 reg 5.6.66(1)'),
 ('notice_first', 'NZ', 'working_days', 5, 'Companies Act 1993 s 239AO(2)'),
 ('notice_second', 'NZ', 'working_days', 5, 'Companies Act 1993 s 239AU(2)'),
 ('notice_creditors', 'NZ', 'working_days', 5, 'Companies Act 1993 s 243(3)-(4)')
on conflict do nothing;

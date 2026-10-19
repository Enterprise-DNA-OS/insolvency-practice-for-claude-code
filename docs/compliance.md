# Rules and sources

Checked 19 October 2026 against the Corporations Act 2001 (compilation of 9 July 2025, including the Insolvency Practice Schedule (Corporations) in Schedule 2), the Insolvency Practice Rules (Corporations) 2016 (compilation 6), the Corporations Regulations 2001 (compilation of 19 December 2025) and the Companies Act 1993 (NZ) as at 1 July 2025. These are records checks for an insolvency desk. They are not legal advice, they do not decide whether a claim is provable or a dividend is safe, and they do not replace the registered liquidator's or licensed practitioner's judgement. Confirm the current text of each provision before relying on it.

Every deadline is a row in `deadline_rules` and every notice period a row in `period_rules` (both in `supabase/migrations/0002_rules.sql`). Change a row through `/customise` and every date moves on the next query.

## Counting days

| Unit | What the system counts | Source |
|---|---|---|
| Business day (AU) | Any day that is not a Saturday, a Sunday or a holiday listed in the `holidays` table for AU or ALL. Load the public and bank holidays for the place concerned each year. | Corporations Act 2001 s 9, "business day" |
| Working day (NZ) | Any day that is not a Saturday, a Sunday, a holiday listed for NZ or ALL, a day from 25 December to 2 January, or the Monday (and Tuesday) after a New Year's Day that falls on a Friday, Saturday or Sunday. Waitangi Day, Good Friday, Easter Monday, Anzac Day, the Sovereign's birthday, Matariki and Labour Day go in the `holidays` table. | Companies Act 1993 (NZ) s 2, "working day" |

## Australia

| Step or check | Rule in the system | Source |
|---|---|---|
| DIRRI, creditors' voluntary liquidation | Due 10 business days after appointment. | Corporations Act 2001 s 506A(2) |
| Initial information and remuneration notice | 10 business days (creditors' voluntary), 20 business days (court). | Insolvency Practice Rules r 70-30(3), r 70-35(5) |
| Report to creditors | 3 months after appointment, with Form 5601 to ASIC. Simplified liquidation's later date is not modelled. | Insolvency Practice Rules r 70-40(3) |
| Voluntary administration: first meeting notice | Treated as due 3 business days after appointment: notice must go at least 5 business days before a first meeting that must be held within 8. The DIRRI and initial information go with it. | Corporations Act 2001 s 436E(2)-(3), s 436DA(3); Insolvency Practice Rules r 70-30(3) |
| First meeting | Held within 8 business days after the administration begins. | Corporations Act 2001 s 436E(2) |
| Second meeting | Last day of the window: 25 business days after appointment (convening period of 20 plus 5), or 30 when the convening period is 25 because it runs over December or Easter (`--extended`). The window also opens 5 business days before the convening period ends; the system tracks the last day. | Corporations Act 2001 s 439A(2), (5) |
| Second meeting notice | At least 5 business days before the meeting, with the report and opinion statement. Lodging with ASIC within 2 business days is not modelled. | Insolvency Practice Rules r 75-225(2)(a), (3), (4) |
| Other creditors' meetings | Notice at least 10 business days before. | Insolvency Practice Rules r 75-40(3) |
| Annual administration return | Form 5602 within 3 months after each 12-month period from appointment. | Insolvency Practice Schedule (Corporations) s 70-5 |
| End of administration return | Form 5603 within 1 month after the administration ends. `/close` records its reference. | Insolvency Practice Schedule (Corporations) s 70-6 |
| Remuneration | Drawn only against a determination by creditors, a committee or the court. `/draw-remuneration` refuses more; `/compliance` reports any overrun as a breach and time above approval as due. The maximum default amount is not modelled. | Insolvency Practice Schedule (Corporations) s 60-5, s 60-10 |
| Dividend notice | The last day for proofs is at least 21 days after the notice. The notice is given no more than 2 months before the intended declaration (not checked). | Corporations Regulations 2001 reg 5.6.65 |
| Dealing with proofs | Admit, reject or ask for more evidence within 14 days after the last day for proofs. `/compliance` reports proofs still undecided. | Corporations Regulations 2001 reg 5.6.66(1) |
| Order of payment | Employee wages and superannuation, then leave, then retrenchment, then unsecured creditors; each class in full before the next. `/declare-dividend` refuses out of order; `/compliance` reports any dividend paid while a higher class is short. Costs of the administration, excluded employee caps and secured creditors are outside the class model and stay with the practitioner. | Corporations Act 2001 s 556 |
| s 533 report to ASIC | Not modelled as a date: it is due within 6 months after it appears to the liquidator that there may be misconduct or a return of 50 cents in the dollar or less. Add a task when that point is reached. | Corporations Act 2001 s 533(1) |

## New Zealand

| Step or check | Rule in the system | Source |
|---|---|---|
| First report | 5 working days after appointment by shareholders or the board (and out of a watershed meeting), 25 working days after a court appointment. | Companies Act 1993 s 255(2)(c) |
| Creditors' meeting | Held within 10 working days (shareholder or board appointment) or 30 working days (court), unless a s 245 notice is given instead; record either with `/record-step` or `/hold-meeting`. Public notice at least 5 working days before. | Companies Act 1993 s 243, s 245 |
| Six-monthly reports | Within 20 working days after each six months from the start of the liquidation. | Companies Act 1993 s 255(2)(d) |
| Final report | As soon as practicable after the liquidator's duties are complete. `/close` records its reference. | Companies Act 1993 s 257 |
| Voluntary administration | First meeting within 8 working days; watershed meeting within 5 working days after a convening period of 20 working days; notice of either at least 5 working days before. | Companies Act 1993 s 239AN(2), s 239AO(2), s 239AT(2), s 239AU(2), s 239AV |
| Remuneration | A liquidator appointed by shareholders or the board charges reasonable remuneration, open to review by the court. The amount recorded with `/approve-remuneration` is the fee basis creditors were told; drawing above it needs a recorded reason and `/compliance` notes it. | Companies Act 1993 s 276, s 284(1)(e) |
| Claims | Admitted or rejected as soon as practicable. No fixed day count is applied. | Companies Act 1993 s 304(3) |
| Preferential claims | Employee claims, then preferential Inland Revenue claims, then unsecured creditors. NZ employee claims rank together in one class: record them all as `employee_wages`. | Companies Act 1993 s 312 and Schedule 7 |
| Licensed practitioner | A licence number is expected on every NZ file. | Insolvency Practitioners Regulation Act 2019; Companies Act 1993 s 280 |

## Sources

- Corporations Act 2001, compilation of 9 July 2025, including the Insolvency Practice Schedule (Corporations): [legislation.gov.au](https://www.legislation.gov.au/C2004A00818/latest/text)
- Insolvency Practice Rules (Corporations) 2016: [legislation.gov.au](https://www.legislation.gov.au/F2016L01989/latest/text)
- Corporations Regulations 2001: [legislation.gov.au](https://www.legislation.gov.au/F2001B00274/latest/text)
- ASIC flowcharts of forms for liquidators and administrators: [asic.gov.au](https://asic.gov.au/for-finance-professionals/registered-liquidators/your-ongoing-obligations-as-a-registered-liquidator/external-administration-controller-appointments-and-schemes-of-arrangement-most-commonly-lodged-forms/)
- Companies Act 1993 (NZ): [legislation.govt.nz](https://www.legislation.govt.nz/act/public/1993/0105/latest/DLM319570.html)
- Insolvency practitioner licensing, Companies Office: [companiesoffice.govt.nz](https://www.companiesoffice.govt.nz/all-registers/insolvency-practitioners/licensing/)

## Limits

The checks follow the dates in the records. A step done but not recorded is invisible to the system, and a holiday not loaded makes a deadline a day early, never late. Receiverships, deeds of company arrangement, small business restructuring, simplified liquidation, members' voluntary liquidations and personal insolvency are not modelled. Recording a dividend calculates and logs the payments; it does not check set-off, the costs of the administration or the excluded-employee caps.

Database controls revoke public access, enable row security and use views that run with the caller's permissions. The activity log is append-only for application users but not against the database owner. Keep backups and test restores.

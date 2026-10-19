# Replace Turnkey IPS

Turnkey does not publish the layout of its exports, and its help lives behind the Turnkey Academy login. What every insolvency system can produce is a creditor listing for a case, exported to Excel. That is what this guide moves. Check the headings against your own report once; after that the import is one command per file.

1. In Turnkey IPS, open the case you are moving and run its creditor listing (the report your team uses for the schedule of creditors, with amounts per the records, amounts claimed, amounts admitted and the proof status). Export it to Excel.
2. Keep the untouched workbook. Save the creditor sheet as UTF-8 CSV. If your headings differ from the ones below, copy `examples/column-map.json` and name your headings once.
3. Open the file in this system first (`/add-appointment`): reference, company, ACN or NZBN, jurisdiction, kind and appointment date. The creditor listing carries creditors and proofs, not the appointment itself.
4. Run the import with `--dry-run`. Fix every row it rejects: a missing name, an amount it cannot read, admitted more than claimed, the same creditor twice in the same class.
5. Run it again without `--dry-run`. Compare the creditor count, the total per records and the total claimed with the workbook.
6. Record what has already happened on the file: steps done (`/record-step`, with the ASIC or Registrar reference), assets realised (`/realise`), payments (`/pay`), remuneration approved and drawn, meetings and dividends. Reconcile cash held with the case bank account before relying on `/position`.

```bash
npm run migrate
node scripts/cases.mjs add-appointment --ref=CVL-101 --company="Company Pty Ltd" --number="ACN 000 000 000" --jurisdiction=AU --kind=cvl --appointed=2026-09-01 --practitioner="Your name" --actor="Your name"
node scripts/cases.mjs import ips creditors.csv --appointment=CVL-101 --map=column-map.json --actor="Your name" --dry-run
node scripts/cases.mjs import ips creditors.csv --appointment=CVL-101 --map=column-map.json --actor="Your name"
```

| Destination | Headings accepted by default | Treatment |
|---|---|---|
| Creditor | Creditor Name, Creditor, Name, Payee | Required |
| Kind | Creditor Type, Type, Category, Class | Mapped by words (employee, ATO or IRD or tax, secured or PPSR, related or director, trade or supplier); anything else is "other" |
| Contact | Email, Email Address, Contact, Contact Email | Optional |
| Per records | Amount per Records, Per Records, RATA Amount, ROCAP Amount, Book Value, Estimated Amount, Amount Owed | Optional; blank stays unknown. Commas and a dollar sign are accepted |
| Claimed | Amount Claimed, Claim Amount, POD Amount, Proof Amount | When present, a proof is created |
| Admitted | Amount Admitted, Admitted Amount, Admitted | Defaults to the claim when the status says admitted |
| Status | POD Status, Proof Status, Claim Status, Status | Part, admitted or accepted, rejected, withdrawn; anything else is "lodged" (still to decide) |
| Lodged | Date Received, POD Received, Date Lodged, Lodged | dd/mm/yyyy or yyyy-mm-dd; blank uses the appointment date |
| Class | Priority, Priority Class, Dividend Class | Wages or super, leave, redundancy or retrenchment, tax (NZ only); anything else is unsecured, or wages for an employee |

The bundled example is synthetic, not an untouched vendor export. Every source column is kept with the imported creditor, including ones that are not mapped.

An employee with a wages claim and a leave claim appears on two rows, one per class: the import makes one creditor with two proofs. Identical creditors are skipped on a repeat import. A creditor that already exists with a different amount stops the whole import: nothing is written.

What does not come across from a creditor listing: the cashbook, time records, statutory lodgements, meeting minutes, document templates, the creditor portal and banking. Export the case receipts and payments as a second sheet and enter the opening position, or keep IPS read-only until each moved file is reconciled. Mapping the cashbook, time and lodgement history is part of what Enterprise DNA does in a custom installation.

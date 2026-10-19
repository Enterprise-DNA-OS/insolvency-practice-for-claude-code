# Examples

- `ips-creditor-listing.csv`: a fictional creditor listing in the shape a Turnkey IPS creditor report saves to from Excel. Dates are dd/mm/yyyy, amounts carry thousands separators.
- `column-map.json`: how to point the import at different headings. Copy it, change the right-hand side to your report's headings, and pass `--map=examples/column-map.json`.

Try it on the demo data:

```bash
node scripts/cases.mjs import ips examples/ips-creditor-listing.csv --appointment=VA-002 --actor="Your name" --dry-run
```

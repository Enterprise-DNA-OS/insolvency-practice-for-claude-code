---
description: "Show what needs a person this week: overdue statutory steps, steps due this week, meetings coming up, proofs waiting on adjudication, overdue tasks, assets not realised, remuneration over approval and quiet files."
---

# attention

Show what needs a person this week: overdue statutory steps, steps due this week, meetings coming up, proofs waiting on adjudication, overdue tasks, assets not realised, remuneration over approval and quiet files.

Run `node scripts/cases.mjs attention`. Add `--json` when you need every field. Resolve the file, creditor or asset by name first; if the CLI says a name is ambiguous, list the candidates and ask. Replace every angle-bracket value with a fact from the records or the operator. Never run a placeholder.

Lead with overdue statutory steps and remuneration over approval. Group by manager. Suggest the one next step for each line.

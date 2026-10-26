---
name: engineering-history
description: Record reusable engineering decisions, condense daily development history, or summarize a topic's evolution with traceable evidence and protected manual notes.
license: MIT
---

# Engineering history

Preserve meaningful engineering decisions or maintain an engineering-history tree. Current specifications, implementation and tests define present behavior; history explains earlier decisions and their evidence.

## Choose useful material

Identify the problem, non-obvious choice, actual outcome and reusable lesson. Link supporting evidence. Routine formatting or repeated checks with no new finding usually need no candidate. Judge from task context; the CLI does not infer meaning from task words.

When material is worth retaining, use the bundled CLI, resolving its path from this Skill directory:

```sh
node <skill-directory>/scripts/cli.mjs candidate --root <project> --task "Decision" --summary "Problem, choice, observed result, reusable lesson" --source-id "project:change:event"
```

Use the original event identity for retries. Set `--event-date` when known, `unknown` when genuinely unknown, and `--timezone` when the project's day boundary differs from UTC. Supply material appropriate for that project's history. Completion: the candidate exists once, or the CLI reports the recording gap.

## Promote deliberately

Read [workflow.md](references/workflow.md) when promoting a candidate or maintaining daily/topic views. A canonical entry needs a reusable judgment, sufficient observed evidence to bound its result and a deduplication check against existing topics. A material-value label requests attention; it does not promote automatically.

Write facts once in `time/`. Make `daily/` a short topic selection and `type/` a compact account of durable topic evolution. Interview and sharing value are independent. Use [templates.md](references/templates.md) when creating entries. Completion: summaries link their canonical sources and introduce no unsupported facts.

## Preserve manual work

Before editing daily/type pages, create a snapshot with `snapshot --root <project> --out <new-relative-file>`. Read existing files, preserve manual bytes outside the AUTO-REFINE region, then run `verify --snapshot <same-file>` and `validate`, using the same root and history directory. New files are reported separately from the baseline's protected files.

A protection failure means inspect the diff and preserve concurrent work. Tools report issues and never reset, restore or delete an unknown writer lock. Completion: material is coherent, local links resolve, protected bytes remain intact and unresolved evidence/protection gaps are reported.

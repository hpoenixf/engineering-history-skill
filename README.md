# Engineering History Skill

Turn repeated development activity into a small, traceable body of engineering knowledge. Includes a self-contained Agent Skill and an offline Node CLI.

[中文使用说明](README.zh-CN.md) · [Skill](skills/engineering-history/SKILL.md) · [MIT license](LICENSE)

Requires Node **26.11.1–26.x**. No runtime dependencies, model calls, account connection or database.


**Engineering walkthrough:** [On-Demand Knowledge, Engineering History and the History Skill](https://hpoenixf.github.io/eff-agent-article/en/articles/027-agent-context-document-history) ([中文](https://hpoenixf.github.io/eff-agent-article/articles/027-agent-context-document-history)). The article shows how candidates, canonical decisions and protected summaries fit into a wider engineering knowledge lifecycle.

## Try the CLI

```sh
git clone https://github.com/hpoenixf/engineering-history-skill.git
cd engineering-history-skill
node bin/engineering-history.mjs validate --root examples --history-dir history
node bin/engineering-history.mjs --help
```

In another project, install the versioned GitHub package:

```sh
npm install --save-dev github:hpoenixf/engineering-history-skill#v0.1.0
npx --no-install engineering-history init
npx --no-install engineering-history candidate --task "Cache invalidation decision" --summary "Problem, decision, observed result and reusable lesson" --source-id "my-project:change-12:decision-1"
npx --no-install engineering-history validate
```

The default tree is `docs/history/`; `--history-dir` selects another project-relative directory. Candidates go to `.work/history-candidates/`. `--root` selects the project. Existing initialization files are preserved. UTC is the default timezone; use `--timezone Asia/Shanghai` or another IANA timezone when recording an event or computing the previous local day.

## Install the Skill

Copy the **entire** `skills/engineering-history` folder into a directory supported by your agent. For Codex, for example:

```sh
mkdir -p "$HOME/.codex/skills"
cp -R skills/engineering-history "$HOME/.codex/skills/engineering-history"
```

Check whether that destination already exists before copying; preserve local edits. The Skill includes its own scripts, references and MIT license, so it works without this repository or the npm binary:

```sh
node "$HOME/.codex/skills/engineering-history/scripts/cli.mjs" --help
```

Ask the agent to record a reusable engineering decision, condense a day's history or summarize a topic's evolution. The CLI supplies mechanical operations; the agent or human chooses meaningful material and writes summaries.

## Four layers

| Layer | Purpose |
| --- | --- |
| candidate | Cheap material collection, allowing later discard |
| time | Canonical decision narrative: context, tradeoff, outcome and evidence |
| daily | A short topic-based reading view over canonical entries |
| type | A topic's durable evolution, with representative source entries |

Interview and sharing value are independent advisory labels. `sync: true` requests review; it does not promote a candidate or prove quality. Task-word keywords never decide promotion.

## Protect manual notes

```sh
npx --no-install engineering-history snapshot --out before.json
# Review and edit only the intended generated regions.
npx --no-install engineering-history verify --snapshot before.json
```

Protection checks pre-existing Markdown files under daily/type. One ordered `BEGIN AUTO-REFINE` / `END AUTO-REFINE` pair identifies an editable region; bytes outside it are protected. Files without markers are protected in full. New files are reported separately. Choose a new snapshot path for a new baseline. The tool never edits history or restores files automatically.

`validate` checks required indexes and local Markdown links. It does not judge summary meaning, check external URLs or prove supporting evidence. Symlink paths are refused to avoid redirected reads/writes. A competing or abandoned candidate lock is reported for inspection, not deleted automatically.

## Contribute

Run `npm test`. Tests exercise actual CLI processes against synthetic projects. Build a local package with `npm pack --ignore-scripts`. See [NOTICE](NOTICE.md) for provenance. Examples are fictional and contain no private development history.

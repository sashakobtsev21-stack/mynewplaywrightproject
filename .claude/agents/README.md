# Agent team (`.claude/agents/`)

A small, curated team of Claude Code subagents used while developing this repo.
Each file is a role definition (frontmatter `name` / `description` / `model` tier,
plus a body with when-to-use, practices, a deliverable contract, and scope
boundaries). Claude Code routes a task to the matching agent automatically, or you
can invoke one explicitly.

These are **adapted** from my agent library
([`my_agents`](https://github.com/sashakobtsev21-stack/my_agents), itself built on
the MIT-licensed [`ruvnet/claude-flow`](https://github.com/ruvnet/claude-flow)).
The library ships 121 general-purpose agents; this repo deliberately keeps only the
eight that fit an **AI-engineering + QA** codebase, with every claude-flow–specific
hook (swarm memory, MCP coordination) removed and each "read first" pointed at this
project's real files. A curated team beats a dumped one — these reference
`src/ai/`, `tests/`, and `playwright.config.ts` directly.

## The team

| Agent                                                 | Tier   | Use it for                                                                      |
| ----------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| [`prompt-engineer`](prompt-engineer.md)               | sonnet | Writing/optimizing the prompt templates in `src/ai/prompts/` and any LLM prompt |
| [`typescript-specialist`](typescript-specialist.md)   | sonnet | Strict-TS implementation/review, `tsc`/lint fixes, type-safe APIs               |
| [`playwright-qa-engineer`](playwright-qa-engineer.md) | sonnet | Writing specs, designing pyramid coverage, debugging flaky tests                |
| [`code-reviewer`](code-reviewer.md)                   | sonnet | Reviewing a diff/PR before merge → explicit verdict                             |
| [`ai-safety-specialist`](ai-safety-specialist.md)     | sonnet | Prompt-injection review, PII redaction in prompts/traces/logs                   |
| [`cost-analyst`](cost-analyst.md)                     | haiku  | Reading AI spend from `logs/ai-traces.jsonl`, budget checks, cheaper routing    |
| [`security-auditor`](security-auditor.md)             | sonnet | Application-security review and threat modeling of this repo's code             |
| [`dependency-auditor`](dependency-auditor.md)         | sonnet | `npm audit` triage by reachability, safe upgrades, supply-chain risk            |

## How to use

```text
# Let Claude Code pick the agent from the task:
Review this diff before I merge it.
Audit the AI layer for prompt-injection and PII leaks.
Find the cheapest model that still passes the data-generator evals.

# Or name one explicitly:
Use the playwright-qa-engineer to add negative tests for the booking-overlap case.
```

The agents hand off to each other along the **scope boundaries** declared at the
bottom of each file (e.g. `code-reviewer` routes a third-party CVE to
`dependency-auditor`, an AI-input risk to `ai-safety-specialist`).

## Provenance & license

Adapted from `my_agents` / `ruvnet/claude-flow` (MIT). Adaptations: removed
claude-flow MCP/swarm coupling, retargeted each agent at this repo's structure,
and rewrote `playwright-qa-engineer`, `ai-safety-specialist`, and `cost-analyst`
around this project's actual AI layer and test suite.

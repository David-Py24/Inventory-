# {{PROJECT_NAME}} agent governance

This folder is the shared governance library for the {{PROJECT_NAME}} workspace. `../AGENTS.md` is the automatically discoverable entry point; this library is not a magical persistent memory service. Agents should read the relevant files when a task calls for them, and update them when durable project knowledge changes.

## Sources of guidance

| Component | Purpose | Update when |
|---|---|---|
| `../AGENTS.md` | Short, always-relevant workspace rules | A core working constraint changes |
| `memory/project-context.md` | Stable project facts and architecture | The system's shape or ownership changes |
| `memory/decisions.md` | Dated decisions with rationale | A consequential choice is made or reversed |
| `memory/open-questions.md` | Unresolved questions with an owner/next step | An uncertainty is added or settled |
| `rules/repository-ownership.md` | Repository boundaries and integration expectations | A repository moves or its role changes |
| `rules/change-control.md` | Scope, review, safety, and verification checklist | Review practice changes |
| `skills/` | On-demand procedures for recurring work | A workflow repeats or is revised |
| Root `Documentation.md` | Chronological progress/changelog | A meaningful implementation milestone completes |

## Operating loop

1. Read the root `AGENTS.md`, then inspect the target repository and its local guidance.
2. For cross-repository or architectural work, read project context, repository ownership, and relevant decisions/open questions.
3. Make the smallest scoped change; keep each repository's Git operations independent.
4. Review changed files, run only the relevant requested or necessary checks, and state results accurately.
5. Capture a durable decision or changed project fact in memory. Add a concise progress entry to root `Documentation.md` for meaningful milestones; do not log routine tool activity.

## Maintenance and checks

- Keep always-loaded guidance concise. Put detailed procedures in skills and load them only when relevant.
- Memory is curated context, not a transcript or a substitute for source code and Git history. Date decisions and supersede outdated entries rather than silently contradicting them.
- At a milestone, check that repository paths still exist, decisions remain current, and local `AGENTS.md` files do not contradict the root rules.
- Start with human-readable review. Add scripts or CI enforcement only after a stable requirement and a clear owning repository have been identified.

## Current scope

{{CURRENT_SCOPE}}

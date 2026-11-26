---
name: record-project-change
description: Use after a meaningful Inventory implementation milestone or when a durable architectural or workflow decision needs to be captured in project documentation.
---

# Record a project change

1. Separate facts into three categories: implementation progress, durable decisions, and unresolved questions.
2. Add a concise dated entry to root `Documentation.md` for a meaningful completed milestone. Follow the existing date/time convention and avoid claiming checks that were not run.
3. Add or revise a decision in `.agents/memory/decisions.md` only when it affects future choices; include date, reason, consequences, and status.
4. Update `.agents/memory/project-context.md` only when a stable fact or ownership relationship changed.
5. Add an actionable item to `.agents/memory/open-questions.md` only if it remains unresolved; remove it when settled.
6. Avoid duplicating the full change log in memory. Keep references short, factual, and useful for future tasks.

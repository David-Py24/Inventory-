---
name: integrate-module
description: Use when connecting or updating a Inventory module inside the main application, including navigation, prototype mounting, or shared shell behavior.
---

# Integrate a Inventory module

1. Read root `AGENTS.md`, `.agents/rules/repository-ownership.md`, and the target module's README/docs and local `AGENTS.md` if present.
2. Inspect Git status and branches separately in `Inventory/` and the module repository. Do not discard existing changes.
3. Trace the current integration path in the main app (routes, navigation, iframe/prototype mounts, assets). Find the canonical module source before copying or changing files.
4. Make the smallest change in the repository that owns each affected concern. Preserve the module's standalone behavior unless the request says otherwise.
5. Check relevant navigation and responsive/accessibility behavior. Run only the appropriate build or checks when requested or necessary; report what was run.
6. Review diffs in both repositories. Update relevant module docs and root `Documentation.md` for a meaningful integration milestone. Record only durable architectural decisions in `.agents/memory/decisions.md`.

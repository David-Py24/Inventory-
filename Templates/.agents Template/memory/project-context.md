# Project context

Last reviewed: {{DATE:YYYY-MM-DD}}

## Purpose

{{PROJECT_PURPOSE}}

## Workspace shape

- Workspace folder: `{{WORKSPACE_FOLDER}}`.
- Main application: `{{MAIN_APP_FOLDER}}`, a {{MAIN_APP_STACK}} app with `src/`, `public/`, and app-level package manifests.
- Sibling repositories: {{SIBLING_REPO_COUNT}} page-focused or module projects, each with its own Git history where applicable.
- Shared assets and archives: workspace-level `Assets/` and `Backups/`.
- Root `Documentation.md` is the dated progress and changelog file.

## Working assumptions

- The main app owns the integrated experience and its navigation; each module repository owns its source and standalone documentation unless specified otherwise.
- A module may have multiple copies or casing variants (`Src`/`src`, `Docs`/`docs`, backups, prototypes). Determine which copy is authoritative before editing.
- The root directory is a workspace/container, not necessarily a Git repository.
- The `.agents` tree holds curated project guidance; it does not automatically remember conversations. Root `AGENTS.md` directs agents to relevant files.

## Known unknowns

- {{KNOWN_UNKNOWN_1}}
- {{KNOWN_UNKNOWN_2}}

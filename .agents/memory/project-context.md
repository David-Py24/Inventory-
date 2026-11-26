# Project context

Last reviewed: 2026-11-25

## Purpose

Inventory management web application with a React frontend and an Express/Drizzle backend.

## Workspace shape

- Workspace folder: `Inventory`.
- Main application: `Inventory`, a React + TypeScript + Vite + Express + Drizzle/PostgreSQL app with `src/`, `public/`, and app-level package manifests.
- The Express backend connects to Supabase PostgreSQL through Drizzle and `DATABASE_URL`; the authoritative schema and migrations live in `server/db/`.
- Root `supabase/` contains the Supabase CLI project config for linking and backup commands; CLI migrations and seeding are disabled so Drizzle remains the single migration source.
- Sibling repositories: 0 page-focused or module projects, each with its own Git history where applicable.
- Shared assets and archives: workspace-level `Assets/` and `Backups/`.
- Root `Documentation.md` is the dated progress and changelog file.

## Working assumptions

- The main app owns the integrated experience and its navigation; each module repository owns its source and standalone documentation unless specified otherwise.
- A module may have multiple copies or casing variants (`Src`/`src`, `Docs`/`docs`, backups, prototypes). Determine which copy is authoritative before editing.
- The root directory is a workspace/container, not necessarily a Git repository.
- The `.agents` tree holds curated project guidance; it does not automatically remember conversations. Root `AGENTS.md` directs agents to relevant files.

## Known unknowns

- Whether sibling module repositories will be added to this workspace.
- Production deployment target and hosting configuration.

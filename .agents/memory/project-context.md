# Project context

Last reviewed: 2026-11-28

## Purpose

Inventory management web application with a React frontend and an Express/Drizzle backend.

## Workspace shape

- Workspace folder: `Inventory`.
- Main application: `Inventory`, a React + TypeScript + Vite + Express + Drizzle/PostgreSQL app with `src/`, `public/`, and app-level package manifests.
- The Express backend's shared Drizzle/PostgreSQL client reads `DATABASE_URL`; the authoritative schema and migrations live in `server/db/`.
- Offline workspace records are stored in local SQLite. Cloud backup, restore, and online account lookup use a separate `SUPABASE_DATABASE_URL` connection so a local `DATABASE_URL` cannot be mistaken for the hosted Supabase database.
- The Vercel hosted web runtime mounts the full Express auth/workspace API and persists its single configured workspace in Supabase `web_workspace_state`; each function's SQLite database is a temporary projection protected by a PostgreSQL advisory lock. Desktop operational storage remains SQLite-first, with manual append-only snapshot upload.
- Main workspace inventory, sales, settings, and utang ledger operate from SQLite; their PostgreSQL backup mirror is managed by Drizzle. The separate PostgreSQL `products`/`inventory_batches` starter subsystem is not yet consolidated with workspace `inventory_items`.
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
- Vercel environment configuration and redeployment for the hosted workspace runtime.

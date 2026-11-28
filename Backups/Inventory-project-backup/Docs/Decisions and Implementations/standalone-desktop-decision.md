# Standalone Desktop Version Decision

**Date:** 2026-11-26  
**Status:** Proposed for implementation  
**Scope:** Preserve the current browser application while adding a separately packaged desktop application.

## Decision

Keep the existing React/Vite application and its Express/Drizzle/PostgreSQL service as the primary web product. Add an Electron desktop shell in a dedicated `electron/` directory and build it as a second distribution target. Both targets should use the same React UI and application logic wherever practical; desktop-only code must stay behind a narrow, typed preload bridge.

The web build, web development command, and server deployment remain independently usable. Desktop packaging must be additive: separate scripts/configuration and a separately verifiable artifact, without requiring Electron at runtime for the website.

For the first desktop release, retain the existing authenticated API and Supabase/PostgreSQL data model. Do not introduce SQLite, a local database, or offline synchronization as part of the shell extraction. Those choices would change the active project decision to use managed PostgreSQL and require a separate data ownership, conflict resolution, backup, and migration decision.

## Why

- A desktop shell can provide an installable standalone window while reusing the existing interface and reducing web/desktop drift.
- The current workspace is already a full-stack web app: `server.ts` serves the SPA and API, and Drizzle connects the backend to PostgreSQL. A packaged renderer alone cannot assume that this server is running locally.
- The active database decision is Supabase/PostgreSQL. Preserving it avoids silently creating a second source of truth.
- Isolating Electron main/preload code prevents Node APIs from entering the browser bundle and lets the web app continue to run in a normal browser.

## Architecture boundaries

- **Web target:** Existing browser UI, Vite workflow, Express API, and configured web deployment remain supported.
- **Desktop target:** Electron main process loads the Vite renderer in development and the packaged renderer in production. It calls the existing remote API through the same configured service URL/auth flow, unless a later decision explicitly changes that arrangement.
- **Shared renderer:** Feature behavior and domain logic stay in `src/`. Detect desktop capabilities only where a real desktop-specific feature is needed; ordinary web operation must not depend on `window.desktopAPI`.
- **Preload bridge:** Expose only specific, validated operations through `contextBridge`; keep `contextIsolation: true` and `nodeIntegration: false`. Do not expose raw `ipcRenderer`, filesystem access, or database handles.
- **Packaging:** Electron dependencies and packaging configuration are development/build tooling. Desktop scripts and artifacts are separate from `dev`, `build`, `start`, and web deployment behavior.
- **Routing/assets:** Configure and verify packaged asset paths and route refresh behavior for the actual router. Do not change Vite's global `base` or replace routing until both web hosting and packaged loading have been checked.

## Constraints and open decisions

1. The current repository uses ESM (`"type": "module"`) and has a custom Vite plugin that copies unbundled assets. Electron entry files should use `.cjs` or an explicitly compatible module format, and packaging must include those copied assets.
2. The current `npm run build` also bundles `server.ts` into `server.js`; desktop packaging must deliberately decide whether the app relies on the hosted API or bundles/runs a local server. This decision selects the hosted API for the initial desktop target; local server bundling is out of scope.
3. The API base URL, production authentication configuration, and desktop distribution/signing targets must be confirmed before release packaging.
4. Offline operation and local persistence remain future work. If required, record a separate decision covering data ownership, synchronization/conflicts, encryption, backups, and migration before implementation.

## Research considered

`Docs/Research/Web-based to Standalone.md` recommends isolating Electron files, using a secure preload bridge, parallel scripts, and guarding native capabilities. These are adopted as direction, subject to verifying compatibility with this repository. Its suggested global `base: './'`, `HashRouter`, and future SQLite path are not adopted automatically: this app's server/Vite hosting, router, copied assets, and active PostgreSQL decision require project-specific validation.

## Success criteria

- The web app can still be developed, built, served, and deployed without Electron installed or launched.
- A separate desktop development and packaging workflow launches the same UI in an Electron window.
- Desktop renderer has no direct Node access; privileged operations, if any, cross a minimal preload API.
- The desktop target uses the intended API/auth configuration and does not silently create a second database source of truth.
- Both targets have documented, repeatable build and smoke-check steps.

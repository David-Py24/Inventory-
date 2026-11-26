# Standalone Desktop Implementation Plan

**Date:** 2026-11-26  
**Related decision:** [`standalone-desktop-decision.md`](../Decisions%20and%20Implementations/standalone-desktop-decision.md)  
**Status:** Phase 2 shell implemented; runtime verification pending.

## Goal

Add an Electron desktop distribution that reuses the existing React application while preserving the current web app and API workflows. The initial shell preserves the renderer's current demo/localStorage behavior. Desktop storage is separate from browser storage; API connectivity and cross-device data sharing are not implemented by this phase.

## Phase 1 — Establish current web baseline

1. Confirm the owning Git repository, branch, and existing changes before implementation.
2. Record current web behavior: `npm run dev`, `npm run build`, `npm run start`, routing/deep-link behavior, Vite asset output, and required environment variables. Avoid changing user work already in progress.
3. Inspect `src/main.tsx`, route setup, API client/auth flow, Vite asset-copy plugin, server deployment config, and `.gitignore` to identify desktop compatibility requirements.
4. Confirm the hosted API URL and authentication approach for a packaged desktop client. Do not embed server secrets or database credentials in the renderer or installer.

**Exit condition:** A reproducible web baseline and documented desktop runtime configuration are known.

### Phase 1 baseline findings — 2026-11-26

- **Repository:** Git root is the workspace root. At baseline capture the current branch was `feature/starter-frontend`; `feat/standalone-hybrid` was created before Phase 2. The working tree already contained numerous unrelated modified, deleted, and untracked files. They were left untouched.
- **Web commands:** `npm run dev` runs `tsx server.ts --dev` (Express API plus Vite middleware); `npm run build` runs `vite build` and bundles `server.ts` to `server.js`; `npm run start` runs that server bundle; `npm run preview` runs Vite preview.
- **Build check:** `npm run build` completed successfully. Vite emitted a config-loader warning about `__dirname` in `vite.config.ts` and a chunk-size warning for the 531.25 kB main JS chunk. The build output uses root-relative `/assets/...` URLs in `dist/index.html`; the Vite plugin also copies `src/assets` to `dist/src/assets`.
- **Routing and state:** The renderer has a custom hash router in `src/App.tsx` (`#/dashboard`, `#/inventory`, etc.) and persists the current app state in `localStorage`. No React Router package or browser-history router is configured.
- **Frontend/backend connection:** The renderer currently imports demo/initial data and reads/writes its app state through `localStorage`; source search found no API client or `fetch` calls to the Express routes. Express exposes health, users/auth, products, batches, and utang routes. Therefore, the existing API/database path is not currently the renderer's data path. The initial desktop shell preserves this behavior; its localStorage is distinct from the browser's.
- **Runtime configuration/deployment:** `PORT` defaults to `8080`; production `start` serves `dist/` and falls back to `index.html`. `.env.example` describes database, Supabase, Gemini, and app URL variables, but there is no frontend API-origin variable or confirmed production API URL. The only checked-in workflow found is for database migrations, not app deployment.
- **Checks not run:** `npm run dev` and `npm run start` were not launched; no browser smoke check, auth/API integration check, or deployment-target verification was performed.
- **Phase status:** Source and build baseline are recorded. Runtime/API deployment configuration is not established, so hosted API connectivity and cross-device data parity remain undecided.

## Phase 2 — Add an isolated Electron shell

1. Add Electron and packaging/orchestration tools as development dependencies only, after selecting a supported packaging target.
2. Create `electron/main.cjs` and, only if needed, `electron/preload.cjs`. Keep these outside `src/`.
3. Create a `BrowserWindow` with `contextIsolation: true`, `nodeIntegration: false`, and a preload path resolved from the packaged app. Add normal lifecycle handling for supported platforms.
4. In development, load the existing Vite development URL. In packaged mode, load the built renderer output using a path-safe file URL or `loadFile`.
5. Expose no bridge until a concrete desktop-only capability is required. If required, define a typed, minimal allowlist; validate IPC inputs in the main process.

**Exit condition:** Desktop shell opens the shared UI without importing Electron or Node modules into React source.

### Phase 2 implementation notes — 2026-11-26

- Added `electron/main.cjs` as an isolated CommonJS Electron main process. Development loads `ELECTRON_RENDERER_URL` when supplied, otherwise the existing Express/Vite development origin at `http://localhost:8080`; packaged mode loads `dist/index.html`.
- Set `contextIsolation`, `sandbox`, and `nodeIntegration: false`. No preload bridge is added because the first shell has no native capability requirement.
- Added Electron as a development dependency (`^45.5.0`). Existing web scripts and runtime dependencies were not changed by this phase. npm required `--legacy-peer-deps` because the existing Vite 8 / esbuild 0.25 dependency tree has a peer range conflict; this pre-existing conflict remains to be resolved separately.
- No Electron development window was launched. Packaged renderer asset paths remain a known Phase 4 compatibility item; the entry point is in place, but the Phase 2 runtime exit condition has not yet been smoke-checked.

## Phase 3 — Add parallel commands and packaging

1. Preserve existing `dev`, `build`, `start`, and web deployment scripts. Add distinct commands such as `desktop:dev` and `desktop:build`.
2. Configure the packager to include the renderer output, Electron entry files, required runtime assets, and only the runtime dependencies needed by the shell.
3. Keep development orchestration from accidentally starting duplicate servers. The initial desktop shell loads the same renderer and does not start or call the Express API. Decide separately whether a later version should connect to a hosted API or run a local server.
4. Decide the installer/output formats, app identifier, icon, versioning, signing/notarization, and release distribution after the target operating systems are confirmed.
5. Add generated desktop artifacts and build intermediates to `.gitignore` as appropriate, without ignoring source/configuration.

**Exit condition:** Web commands remain unchanged in purpose, and desktop artifacts can be built through an independent command.

## Phase 4 — Resolve routing and asset compatibility

1. Verify the current router and whether it requires server-side SPA fallback. Preserve web deep links and refresh behavior.
2. Inspect built HTML/CSS/JS URLs and the custom copied `src/assets` output.
3. If packaged `file://` loading requires relative paths or a router mode change, implement a target-aware configuration that preserves web hosting behavior. Avoid a global Vite base or router change until both targets are verified.
4. Prefer a custom app protocol or another safe routing setup if needed; do not disable web security to work around asset paths.

**Exit condition:** Main screen, nested routes, refresh/navigation, styles, and copied assets work in both browser and packaged renderer.

## Phase 5 — Configure API access and security

1. Use the existing API and auth contracts. Make the desktop API origin configurable for development and release without exposing credentials.
2. Verify CORS, cookie/token behavior, and secure transport for the packaged origin. Adjust the server only where necessary and preserve browser clients.
3. Keep tokens and secrets out of logs and source. Assess the existing auth storage model in a desktop context before release.
4. Add a bridge capability only for a defined requirement; document its contract and test invalid IPC inputs and renderer isolation.

**Exit condition:** Desktop users can authenticate and use core inventory workflows against the intended service without privileged renderer access.

## Phase 6 — Verification and release readiness

Run and record these checks when implementation is performed:

- Existing web development and production build/start flow.
- Desktop development launch and packaged build on each selected OS.
- Smoke checks for login, core inventory screens/actions, API failure handling, deep links/navigation, reload behavior, and asset loading.
- Inspect Electron security settings and packaged file contents for accidental `.env`, database credentials, or unnecessary source/build files.
- Confirm desktop output is reproducible from a clean checkout with documented setup.

Do not mark a check passed until it has actually been run. Do not claim offline support unless separately designed and verified.

## Deferred work / separate decisions

- SQLite or other local database adoption.
- Offline-first workflows, synchronization, merge/conflict rules, and retry behavior.
- Local Express server packaging.
- Auto-update, installer signing/notarization, and release channel operations.
- Native filesystem, printing, notifications, or OS integrations.

## Risks to resolve during implementation

- A desktop app calling a hosted API depends on network availability and production auth/CORS configuration.
- Browser cookie assumptions may not carry over to Electron's custom origin; token handling needs explicit review.
- `file://` routes and asset URLs may differ from the current web server behavior.
- Packaging may omit files created by the existing Vite asset-copy plugin unless included deliberately.
- The chosen Electron/packager versions must be compatible with the project's Node and Vite toolchain at implementation time.

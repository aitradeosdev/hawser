# Development Log

Exhaustive, append-only record of every creation / edit / removal. Newest entries at the top of each
day. Rule: **if it isn't here, it didn't happen.** The README carries a condensed digest; durable facts
are mirrored to persistent memory.

Legend: `+` created · `~` edited · `-` removed · `!` decision · `⚙` command run · `⚠` issue/fix.

---

## 2026-07-17 — Session 1: Project bootstrap & foundation

**Environment recon**
- ⚙ Verified toolchain: Node v24.15.0, npm 11.12.1, git 2.54.0.windows.1. No pnpm, no docker.
- ⚙ Confirmed working dir `c:\Users\HP\Grudxxl` empty; memory dir empty (no prior MEMORY.md).

**Repository**
- ⚙ `git init -b main` in `c:\Users\HP\Grudxxl`.
- `+ .gitignore` — Next.js/monorepo ignores; hard-excludes `.env*` (except `.env.example`), keys,
  secrets, rendered `*.local.pdf`, caches.

**Foundation docs**
- `+ README.md` — project charter: positioning (authentic/verifiable docs), the ⚠ core boundary
  (issue-your-own vs fake-third-party), chosen stack table, repo layout, condensed dev log, and the
  logging-discipline statement. Marks "Attestly" as a **provisional** codename.
- `+ docs/ARCHITECTURE.md` — system overview diagram; bifurcated rendering strategy (Playwright for
  official docs, Satori for previews, pdf-lib post-processing; wkhtmltopdf banned, cloud PDF APIs
  rejected); Next.js per-route rendering decision tree; security invariants (data-layer auth, patch RSC
  CVEs); multi-tenancy model; deployment topology; open questions.
- `+ docs/DECISIONS.md` — ADR-000..010. Accepted: 000 (anti-fraud pillar), 001 (Next.js 16), 002
  (self-hosted Playwright), 003 (Postgres+Drizzle), 010 (npm workspaces monorepo). Proposed: 004
  (Supabase vs Neon), 005 (R2), 006 (WorkOS vs Better Auth), 007 (Konva vs Fabric), 008 (TipTap+Yjs),
  009 (per-user MCP server).
- `+ docs/SAFETY.md` — normative acceptable-use: the hard boundary, MVP guardrails (KYB gating, unique
  IDs, audit trail, QR verification portal, labelling), V1+ authenticity (C2PA/PAdES/RFC3161), global
  compliance (eIDAS 2.0, GDPR, CCPA/CPRA, SOC 2, KYC/AML), encryption/access control, verified-source
  context (FTC $12.5B/2024; Cotality 0.86%/46%), legal action items.
- `+ docs/ROADMAP.md` — Phase 0 / MVP / V1 / V2 sequencing (templates → canvas+AI → programmatic/MCP);
  monetization tiers.
- `+ docs/DEVLOG.md` — this file.

**App scaffold**
- ⚠ `create-next-app` failed twice ("application path is not writable") — root cause: it checks the
  *parent* dir's writability and `apps/` did not exist. Fix: create `apps/` first, then scaffold into
  `apps/web`. (First attempt via Git Bash, second via PowerShell — same cause, not a shell issue.)
- ⚙ `New-Item apps` + `npx create-next-app@latest apps/web --ts --tailwind --eslint --app --no-src-dir
  --use-npm --import-alias '@/*' --yes` — ✅ succeeded. Scaffolded **Next.js 16.2.10, React 19.2.4,
  Tailwind v4**, App Router, ESLint, import alias `@/*`. Detected the parent git repo (no nested `.git`).
- `+ apps/web/**` — standard Next.js app: `app/`, `public/`, `next.config.ts`, `tsconfig.json`,
  `postcss.config.mjs`, `eslint.config.mjs`, `package.json`, `.gitignore`, `README.md`.

**Monorepo root & workspace install**
- `+ package.json` (root) — npm workspaces (`apps/*`, `services/*`, `packages/*`), delegating
  `dev/build/start/lint` scripts to `apps/web`, `engines.node >=20`, `license: UNLICENSED` (proprietary
  for now; license choice deferred).
- `+ .env.example` — documented env surface (DB, R2, WorkOS/Better Auth, renderer, Redis, Stripe, KYB,
  verification/signing). Placeholders only; real secrets git-ignored.
- ⚠ First root `npm install` failed (exit 45, `ENOTEMPTY`/`EPERM` on `rmdir`) — hoisting tried to delete
  the pre-existing `apps/web/node_modules/next/dist/docs/...` deep paths (>260 chars). Extraction works
  on this system (scaffold installed fine); only deletion of deep pre-existing dirs failed.
- ⚙ Attempted fix: `git config core.longpaths true`; cleared `node_modules` via `robocopy /MIR`
  empty-mirror trick + `Remove-Item`; removed stray `package-lock.json`s; then root `npm install`.
- ⚠⚠ **Footgun (destructive):** the failed first root install had created an npm workspace **junction**
  `node_modules/web → apps/web`. `robocopy /MIR` follows junctions without `/XJ`, so mirroring an empty
  dir over root `node_modules` **traversed the junction and wiped the real `apps/web` scaffold**
  (`package.json`, `app/`, configs all gone). No data loss of value — it was a fresh scaffold — but the
  scaffold had to be rebuilt. **Lesson:** never `robocopy /MIR` over a `node_modules` that may contain
  workspace symlinks/junctions (use `/XJ`, or just don't); prefer avoiding hoist-over-existing entirely.
- ⚙ **Clean recovery:** delete bogus root `package-lock.json`; re-run `create-next-app apps/web ...
  --skip-install` (files only, no `node_modules`); then a single fresh root `npm install` (nothing
  pre-existing to delete or junction into) → hoisted workspace `node_modules`; then
  `npm run build --workspace apps/web`.

**✅ Verified baseline (green)**
- ⚙ `npm install` (root): added 362 packages, 0 install errors. `+ package-lock.json` (single root lock).
  Workspace symlink `node_modules/web → apps/web` created (normal; git-ignored). `apps/web` fully
  hoisted (no nested `node_modules`).
- ⚙ `npm run build --workspace apps/web`: **✓ compiled in 17.9s, TypeScript passed**, 4 static pages
  generated (`/`, `/_not-found`). Next.js 16.2.10 (Turbopack).
- ⚠ `npm audit`: 2 moderate vulnerabilities reported. **Not** auto-fixed (`--force` could break Next).
  TODO: review + patch deliberately.
- Verified `apps/web` key files present: `package.json`, `next.config.ts`, `tsconfig.json`,
  `app/page.tsx`, `app/layout.tsx`.

**Commit & housekeeping**
- ⚙ First commit `b2bb5d0` — "chore: bootstrap Attestly monorepo — foundation, docs, Next.js 16 app"
  (28 files tracked; `node_modules` correctly ignored).
- Noted: `create-next-app` also generated `apps/web/AGENTS.md` + `apps/web/CLAUDE.md` (agent-guidance
  stubs) and `apps/web/app/{page,layout}.tsx`, `globals.css` — default template, to be replaced when the
  app shell is built.
- `+ .gitattributes` — normalize text to LF (`* text=auto eol=lf`), mark binaries, collapse
  `package-lock.json` in diffs. Fixes the CRLF/LF warnings seen on first commit.

**Outcome of Session 1:** working Next.js 16 monorepo baseline (green build) + full docs/memory/logging
foundation, committed. Ready to begin Phase 0 feature work pending direction from the user
(name confirmation, first-increment focus, cloud-service posture).

**Memory**
- `+ memory/MEMORY.md` (index) + `+ memory/{attestly-project-overview, attestly-tech-stack,
  attestly-safety-boundary, logging-discipline, attestly-build-status}.md`.

---

<!-- New entries appended above this line, under the current date. -->

# Architecture Decision Records (ADRs)

Each ADR is immutable once accepted; superseding decisions get a new ADR that references the old one.
Every ADR add/change is logged in [DEVLOG.md](DEVLOG.md).

Format: **Context → Decision → Consequences → Status**.

---

## ADR-000 — Anti-fraud/authenticity is a core pillar, not a feature
- **Context:** The platform can produce bank letters, statements, and legal letters. An irresponsible
  build is indistinguishable from a fake-document generator (forgery/fraud; wire-fraud exposure for
  users, secondary-liability and reputational risk for us).
- **Decision:** Ship anti-fraud guardrails **in the MVP**: KYB org-verification gating, the
  issue-your-own-vs-impersonate boundary, unique document IDs, tamper-evident audit trails, and a
  QR-to-issuer verification portal. Treat these as product requirements with the same priority as auth.
- **Consequences:** Higher MVP scope, but the guardrails become the brand's differentiator (verifiable
  documents). Institutional templates are gated; individuals get generic templates only.
- **Status:** Accepted. See [SAFETY.md](SAFETY.md).

## ADR-001 — Next.js 16 App Router as the framework
- **Context:** Need instant rendering, SEO for marketing/templates, and a rich app shell.
- **Decision:** Next.js 16, App Router, RSC + PPR + Streaming. Rendering strategy chosen per route
  (SSG/ISR/Streaming-RSC/SSR). Explicit `"use cache"`.
- **Consequences:** RSC cuts client JS; canvas/editor/PDF live in `"use client"` boundaries and a
  separate rendering microservice. Must validate auth at the data layer (not middleware — CVE-2025-29927)
  and keep patched (RSC deserialization CVEs).
- **Status:** Accepted.

## ADR-002 — Self-hosted headless-Chromium (Playwright) as primary PDF engine
- **Context:** "Official" fixed-layout docs need pixel-perfect, selectable-text PDFs. Financial/legal
  data must not leave our infra.
- **Decision:** Playwright renderer as a **separate stateless microservice** behind a queue + worker
  pool. Satori for thumbnails/previews; pdf-lib for post-processing; WeasyPrint/React-PDF optional.
- **Consequences:** Ops complexity (Chromium is RAM-heavy) but full fidelity + data control.
  **wkhtmltopdf banned; cloud PDF APIs rejected** for regulated data.
- **Status:** Accepted.

## ADR-003 — Postgres + Drizzle
- **Decision:** Postgres for relational metadata (docs, orgs, audit). Drizzle ORM (type-safe,
  serverless-friendly). RLS for tenant isolation.
- **Status:** Accepted (provider choice in ADR-004).

## ADR-004 — Postgres provider: Supabase (default) vs Neon
- **Context:** Supabase = batteries-included (auth, storage, realtime, RLS, region select). Neon =
  serverless scale-to-zero + branching, good for spiky/multi-tenant-idle.
- **Decision:** **Supabase** default for steady traffic + heavy relational metadata + EU region option.
  Revisit Neon if workloads become spiky. **Provisional** — no cloud project created yet.
- **Status:** Proposed.

## ADR-005 — Object storage: Cloudflare R2
- **Decision:** R2 (zero egress — important for a download-heavy product). S3 as alternate.
  PDFs/assets/fonts/thumbnails in R2; metadata in Postgres; presigned short-lived download URLs.
- **Status:** Proposed.

## ADR-006 — Auth/orgs: WorkOS (default) vs Better Auth
- **Context:** Need enterprise SSO/SCIM, Organizations, RBAC, and an **MCP-compliant OAuth 2.1 AS**.
- **Decision:** **WorkOS AuthKit** — orgs + RBAC/FGA + SSO/SCIM + doubles as MCP OAuth AS. Choose
  **Better Auth** (self-hosted) instead if EU data residency / user-table ownership becomes a hard req.
  (Clerk rejected as default: no EU data residency in 2026, cost at scale.)
- **Status:** Proposed.

## ADR-007 — Design canvas: Konva.js (default) vs Fabric.js
- **Decision:** **Konva** (`react-konva`) — purpose-built object model, Transformer, serialization,
  layered rendering, official React bindings. Switch to **Fabric** only if SVG import/export becomes a
  hard requirement. Toolbars/panels/layers/undo-redo are built by us (or accelerated via a commercial SDK).
- **Status:** Proposed.

## ADR-008 — Rich text + collaboration: TipTap + Yjs (self-hosted)
- **Decision:** **TipTap** (ProseMirror, JSON model) for letters/legal docs; **Yjs** CRDT +
  **Hocuspocus** WebSocket for real-time collaboration (self-hosted, avoids TipTap paid Cloud).
  Lexical is the fallback for extreme scale. Liveblocks optional managed infra.
- **Status:** Proposed.

## ADR-009 — Per-user remote MCP server (OAuth 2.1 + PKCE)
- **Decision:** Ship a remote hosted MCP server exposing document tools; per-user OAuth 2.1 + PKCE
  tokens managed in Settings → AI/MCP Access; RFC 8707 audience-binding; human confirmation on
  send/sign tools. Follow Linear/Stripe/Notion conventions.
- **Status:** Proposed (post-V1).

## ADR-010 — Package manager & repo shape: npm workspaces monorepo
- **Context:** pnpm/docker not installed; npm 11 (workspaces-capable) + Node 24 present.
- **Decision:** **npm workspaces** monorepo (`apps/*`, `services/*`, `packages/*`). Revisit pnpm/turbo
  if build times warrant. Keeps friction low on the current Windows toolchain.
- **Status:** Accepted.

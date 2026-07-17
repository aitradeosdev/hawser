# Architecture

Status: living document. Updated as subsystems are designed/built. Every change is logged in
[DEVLOG.md](DEVLOG.md).

## System overview

```
Client (Next.js RSC shell + "use client" canvas/editor)
   │
   ▼
Vercel / CDN (Cloudflare in front: CDN + WAF)
   │
   ▼
App API  ── Server Actions + Route Handlers ──┐
   │                                          │
   ├──► Postgres (Supabase)   document + org + audit metadata, RLS multi-tenancy
   ├──► Cloudflare R2         rendered PDFs, uploaded assets, fonts, thumbnails
   ├──► Redis (Upstash)       sessions, rate limits, job state
   │
   ├──► Render Queue (SQS/Upstash) ──► Playwright worker pool (containers) ──► R2
   │                                   pixel-perfect PDF export (A4/Letter/Legal)
   │
   ├──► Collaboration: Yjs WebSocket (Hocuspocus)   presence, multi-cursor, CRDT merge
   │
   └──► MCP: per-user remote MCP server (OAuth 2.1 + PKCE) ──► same App API layer

Auth: WorkOS (user mgmt, Orgs/Members/Roles, SSO/SCIM) — doubles as the MCP OAuth 2.1 AS.
```

## Rendering strategy (bifurcated by document type)

The single most important architectural decision. Document type determines the engine.

| Document class | Engine | Why |
|----------------|--------|-----|
| **Fixed-layout "official" docs** (bank letters, statements, invoices) | **Playwright / headless Chromium** microservice | Pixel-perfect CSS grid/flex, web fonts, print CSS; selectable/searchable text (not screenshots) |
| Thumbnails, social cards, quick previews | **Satori** (`@vercel/og`) HTML/CSS→SVG→PNG | Fast; build-time/queued (CSS subset only) |
| Pure text-heavy server-side docs (no JS charts) | **WeasyPrint** (optional) | Lightweight CSS Paged Media, no Chromium |
| Programmatic React-component PDFs | **React-PDF** (optional) | When layout is controlled in code |
| Post-processing: merge/stamp/watermark/sign | **pdf-lib** | Apply signatures, C2PA, QR, watermarks to generated PDFs |

**Banned: `wkhtmltopdf`** — archived Jan 2023, unpatched CVEs, maintainers warn against untrusted HTML.

**Cloud PDF APIs (DocRaptor/PDFShift/Gotenberg): rejected** for this regulated use case — they would
send sensitive financial/legal data to a third party. The renderer is **self-hosted**.

### Playwright renderer contract (draft)
- Runs as a **separate stateless microservice** (Node + Playwright, containerized). Chromium is
  RAM-heavy (6–11× lightweight tools) and must not run inline in serverless functions.
- Horizontally scaled behind a **queue** with a worker pool; capped concurrency; per-tenant rate limits.
- `page.pdf({ format, printBackground: true, preferCSSPageSize: true })`; wait for `networkidle0`.
- **Pagination**: CSS Paged Media (`@page`, margins, bleed) + "render then measure" for variable-length
  docs (multi-page statements). Fonts embedded via `@font-face` (base64 or served BaseURL), subset.
- **Caching**: rendered PDFs cached in R2 keyed by `hash(templateId + data + version)`.

## Next.js rendering decision tree (per route)

| Route type | Strategy |
|-----------|----------|
| Marketing / landing / docs | **SSG** (build once, CDN) |
| Template gallery / public template pages | **ISR** + on-demand revalidation |
| Dashboard / editor shells | **Streaming RSC + Suspense** (per-data-source boundaries) |
| Personalized always-fresh | **SSR** only when necessary (most expensive) |

- Default to **Server Components**; only interactive pieces are `"use client"` (canvas, editor,
  drag-and-drop, rich text all require client boundaries).
- Use `"use cache"` (Next 16) explicitly — no implicit caching.
- **Security invariants** (this app handles financial/legal data):
  - Do **not** rely on middleware-only auth (CVE-2025-29927 `x-middleware-subrequest` bypass) —
    validate sessions at the **data layer**.
  - Keep Next.js patched (RSC deserialization CVE cluster, late-2025/early-2026).

## Multi-tenancy

`Organization → Members → Roles`. Every query scoped to a tenant (Postgres RLS + WorkOS orgs).
Roles: Owner, Admin, Editor, Viewer, **Verified Issuer** (KYB-gated — unlocks institutional templates).

## Deployment topology

- Frontend: Vercel (or self-host AWS ECS / Fly.io). Monitor usage-based cost at SSR/ISR scale.
- Renderer: regional Node runtimes (not edge) — worker pool of Chromium containers behind the queue.
- Read-heavy public routes: edge/CDN. Collaboration: regional WebSocket (Hocuspocus).
- Cloudflare front: CDN + WAF + R2.

## Open architecture questions (tracked)

- Konva vs Fabric final call (SVG import/export requirement?) — see DECISIONS ADR-007.
- Supabase vs Neon final call (steady vs spiky traffic; EU residency) — ADR-004.
- WorkOS vs Better Auth (managed vs EU data ownership) — ADR-006.
- Self-host renderer orchestration: ECS Fargate vs Fly.io vs Cloud Run — ADR-008 (deferred).

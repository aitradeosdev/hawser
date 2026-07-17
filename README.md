# Attestly

> **Codename — provisional.** "Attestly" is the working name (from *attest*: to certify / authenticate).
> It threads through package names and branding but can be renamed in a single pass. Alternates on the
> table: Docketa, Certis, Vellum, Papyra. Any name must pass a USPTO Class 42 + EUIPO/WIPO screen and
> `.com`/handle check **before** it is treated as final.

A design-led, AI-native platform for creating **authentic, verifiable professional documents** —
invoices, business letters, statements, receipts, contracts — across every profession, through four
creation modes: **fill-in templates · drag-and-drop canvas · AI generation · programmatic / mail-merge**.

The differentiator is **authenticity**. Every "official" document an organization issues can carry a
QR-to-issuer verification link, a cryptographic signature (PAdES), content provenance (C2PA), and a
tamper-evident audit trail. This turns the category's biggest risk — forgery — into the product promise.

---

## ⚠️ The core boundary (non-negotiable)

This platform helps an organization issue documents **it is authorized to issue**. It is **not** a tool
for fabricating a third party's documents.

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| Your verified org issues its own letters/statements/invoices | Uploading another entity's branding/logo you can't prove you control |
| Generic, clearly-personal templates for individuals | Producing a document that impersonates a bank/employer/agency you don't represent |
| Documents labelled as the issuer's own attestation | Passing a self-generated document off as a verified third-party record |

Institutional / bank-branded templates are **locked behind KYB organization verification** (a
"Verified Issuer" role). Individuals get only generic templates. See [docs/SAFETY.md](docs/SAFETY.md)
for the full acceptable-use design, guardrails, and legal context. These guardrails ship in the MVP,
not later — they are the product, not a feature.

---

## Status

**Phase: `Foundation` (pre-MVP).** See [docs/ROADMAP.md](docs/ROADMAP.md) for the MVP → V1 → V2 plan
and [docs/DEVLOG.md](docs/DEVLOG.md) for the exhaustive, per-change build log.

Current: repository initialized, foundation docs written, Next.js 16 app scaffolding.

## Tech stack (chosen defaults)

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16** (App Router, RSC, PPR, Streaming) | Auth validated at the data layer, never middleware-only |
| Language | **TypeScript** | strict |
| Styling | **Tailwind CSS v4** + **shadcn/ui** (Radix) + **Motion** | OKLCH tokens for multi-brand theming |
| DB | **Postgres** (Supabase default; Neon alt) | multi-tenant, RLS |
| ORM | **Drizzle** | type-safe, serverless-friendly |
| Object storage | **Cloudflare R2** (S3 alt) | zero egress; PDFs/assets/fonts/thumbnails |
| Rendering | **Playwright / headless Chromium microservice** | pixel-perfect PDFs; runs off-serverless behind a queue |
| Canvas | **Konva.js** (`react-konva`) | Fabric.js if SVG import/export becomes a hard req |
| Rich text | **TipTap** (ProseMirror) + **Yjs**/Hocuspocus | real-time collaboration, self-hosted |
| Auth / orgs | **WorkOS** (also MCP OAuth AS); Better Auth if EU residency required | Orgs → Members → Roles + Verified Issuer |
| AI access | Per-user **remote MCP server** (OAuth 2.1 + PKCE) | user connects their own model |
| Payments | **Stripe** (Billing + Connect for marketplace) | freemium + per-seat + usage |

Full rationale in [docs/DECISIONS.md](docs/DECISIONS.md).

## Repository layout

```
/                     repo root (codename Attestly)
├── README.md         this file — project charter + status + condensed log
├── docs/
│   ├── ARCHITECTURE.md   system design & rendering pipeline
│   ├── DECISIONS.md      Architecture Decision Records (ADRs)
│   ├── SAFETY.md         acceptable-use, anti-fraud boundary, guardrails
│   ├── ROADMAP.md        MVP → V1 → V2 sequencing
│   ├── DEVLOG.md         exhaustive per-change build log  ← every edit logged here
│   └── design/           implementation-ready subsystem specs (added as we build)
├── apps/
│   └── web/          Next.js 16 application (frontend + app API)
├── services/         (future) renderer microservice, MCP server
└── packages/         (future) shared types, UI kit, template schema
```

## Development log (condensed)

The **full, granular** log lives in [docs/DEVLOG.md](docs/DEVLOG.md). This section is the human-readable
digest. Every creation/edit is recorded in both places, and mirrored to persistent memory.

- **2026-07-17** — Project bootstrapped. `git init` (branch `main`). Wrote `.gitignore`, `README.md`,
  and the docs suite (ARCHITECTURE, DECISIONS, SAFETY, ROADMAP, DEVLOG). Scaffolded Next.js 16 app in
  `apps/web` (TS, Tailwind v4, App Router, ESLint). Established the logging discipline described below.

## Logging discipline

Per project rule: **every edit, creation, or removal of any detail is logged** to two places —
1. **[docs/DEVLOG.md](docs/DEVLOG.md)** — one dated entry per change, with file paths and rationale.
2. **Persistent memory** — durable facts (decisions, status, boundaries) so context survives sessions.

The README digest above is updated per working session. If it isn't in the DEVLOG, it didn't happen.

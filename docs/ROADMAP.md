# Roadmap

Sequencing rule: **templates → canvas + AI → programmatic/MCP.** Don't build all four creation modes at
once. Anti-fraud guardrails ship in the MVP, not later. Every scope change is logged in [DEVLOG.md](DEVLOG.md).

## Phase 0 — Foundation (current)
- [x] Repo init, docs suite, logging discipline, memory.
- [ ] Next.js 16 app scaffold (`apps/web`) — in progress.
- [ ] npm workspaces monorepo root.
- [ ] Base design system: Tailwind v4 tokens (OKLCH), shadcn/ui init, Motion.
- [ ] App shell (marketing landing + app layout), auth stub, DB schema (Drizzle) skeleton.

## MVP (0–4 months) — "issue-your-own, verifiably"
- Auth + Organizations (WorkOS): Orgs → Members → Roles incl. **Verified Issuer**.
- **Fill-in template engine** for the top 5 document types: invoice, business letter, bank letter,
  statement, receipt. JSON template model + merge fields.
- **Playwright PDF export** microservice (A4 / US Letter), selectable text, R2 storage.
- Stripe billing (freemium + Pro).
- Template gallery (basic).
- **Anti-fraud, day one (non-negotiable):** KYB gating, issue-vs-impersonate boundary, unique document
  IDs, tamper-evident audit trail, **QR-to-issuer verification portal**.

## V1 (4–9 months) — design + intelligence
- **Drag-and-drop Konva canvas** (toolbars, layers, properties, snapping, undo/redo, export).
- **TipTap rich text** + **Yjs/Hocuspocus** real-time collaboration (presence, multi-cursor).
- **AI generation** (draft-from-prompt into labelled/reviewable templates; AI fill of merge fields).
- **C2PA Content Credentials** + **PAdES** signing on exports.
- **SOC 2 Type II** kickoff.

## V2 (9–18 months) — platform + enterprise
- **Programmatic / mail-merge API + webhooks** (CSV/Sheets/Airtable/JSON → batch render).
- **Per-user remote MCP server** (OAuth 2.1 + PKCE) in Settings → AI/MCP Access.
- **Templates marketplace** (creator revenue share; Stripe Connect).
- Enterprise: SSO/SCIM, QES, **data residency (EU)**, eIDAS-2.0 wallet readiness, audit-log export.

## Monetization (target)
- **Free** (limited docs/mo, watermarked, generic templates).
- **Pro** (~$12–20/mo — full templates, AI credits, no watermark, verification portal).
- **Business/Teams** (~$16–20/user/mo — collaboration, brand kits, RBAC, approval workflows, org verification).
- **Enterprise** (custom — SSO/SCIM, SOC 2 report, data residency, QES, audit logs).
- **Usage add-ons:** AI credits, programmatic doc volume, QES signatures, verification-portal volume.
- **Marketplace:** creator revenue share. **MCP/agent actions:** gated to paid tiers, metered.

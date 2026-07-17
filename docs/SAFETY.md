# Safety, Acceptable Use & Anti-Fraud Design

This is the defining constraint of the product. Because the platform can produce bank letters,
statements, and legal letters, an irresponsible build is indistinguishable from a forgery tool. This
document is normative: features that violate it do not ship. Changes are logged in [DEVLOG.md](DEVLOG.md).

## 1. The hard boundary

> **Allow:** an organization issuing a document **it is authorized to issue**.
> **Forbid:** faking a **third party's** document.

| ✅ Allowed | ❌ Forbidden |
|-----------|-------------|
| A **verified** org issues its own letter/statement/invoice on its own branding | Uploading a bank/employer/agency's logo or branding the account can't prove it controls |
| Individuals use **generic, clearly-personal** templates | Producing a document that impersonates an institution the user doesn't represent |
| Documents presented as the **issuer's own attestation** | Passing a self-generated document off as a verified third-party record |

Resistant AI's observation drives the UX: *"if the interface looks like a regular productivity tool,
some users may not experience it as forgery software."* Therefore the UX must **actively reinforce** the
boundary (labels, gating, friction on high-risk types) rather than be neutral.

## 2. MVP guardrails (ship in MVP — non-negotiable)

1. **KYB org-verification gating.** Bank-branded / institutional / "official" templates are locked
   behind a **Verified Issuer** status. Verify (a) the org is real, (b) the requester is authorized to
   issue on its behalf, (c) it legitimately owns the branding it uses. Providers to integrate: Middesk,
   Inscribe (SOC 2 Type II + ISO 27001), Resistant AI, AiPrise, Heron Data. Individuals → generic
   templates only.
2. **Hard product boundary enforcement** (see §1) — no uploading third-party branding without proof of control.
3. **Unique document IDs** on every generated document.
4. **Tamper-evident audit trail** — every issue / access / revoke event, immutable.
5. **QR-to-issuer verification portal** — a unique QR per document links to a verification page on the
   **issuer's own/branded domain** (e.g. `verify.acme.com`) showing issuer, recipient, issue date,
   document ID, and live status (Valid / Revoked). A forged or altered PDF still carries the original QR,
   which reveals the discrepancy. Aligns with ISO/IEC 18013-5 (mDL) direction.
6. **Labelling** — watermark/label unverified, sample, or specimen documents; make explicit that a
   generated document is the **issuer's own attestation**, not a verified third-party bank record.

**Abuse benchmark:** if fraud/abuse reports exceed ~1% of generated "official" docs, tighten gating
(require Verified Issuer for **all** bank/legal templates), and consider geofencing/enhanced
verification for the highest-risk types (bank statements).

## 3. V1+ authenticity features (turn forgery risk into a trust product)

- **C2PA Content Credentials** on exported PDFs — signed provenance manifest, tamper-evident. Built on
  X.509 (RFC 5280), CBOR (RFC 8949), COSE (RFC 9052), JUMBF (ISO 19566-5). Post-quantum ML-DSA
  (NIST FIPS 204) planned. NSA-endorsed (Jan 2025 guidance).
- **PAdES cryptographic signatures** (ETSI EN 319 142; B-B/B-T/B-LT/B-LTA) — eIDAS-recognized; signature
  embeds in and travels with the PDF. Offer **QES** via a Qualified TSP (EU Trusted List) for highest assurance.
- **RFC 3161 trusted timestamps** (qualified TSA under eIDAS; NIST SP 800-102); optional
  **OpenTimestamps** (SHA-256 anchored to Bitcoin) for trustless proof-of-existence.

## 4. Global compliance obligations

- **E-signatures:** satisfy intent, consent, attribution, retention across ESIGN+UETA (US), eIDAS (EU/UK),
  PIPEDA (CA), ETA (AU), IT Act (IN), MP 2.200-2/ICP-Brasil (BR), ECTA (ZA). Tiered: SES / AES / QES.
  Tamper-evident audit trail (signer identity, timestamps, IP, device, document hash) is the single most
  important legal component. **eIDAS 2.0** (Reg (EU) 2024/1183): EU Digital Identity Wallets mandated
  across 27 member states by **Dec 2026** — build flexible identity-wallet integration.
- **Data protection:** GDPR (Art. 32 encryption; Art. 28 signed DPA; 72-hour breach notice; lawful
  transfer via adequacy / EU-US DPF / SCCs + TIA). CCPA/CPRA (2026 rules add cybersecurity audits, risk
  assessments, ADMT; private right of action $100–$750/consumer for unencrypted breaches). Offer **EU
  data residency** (region-selectable DB; a reason to favor Supabase/Neon region select or Better Auth).
- **SOC 2 Type II** — pursue early (enterprise-sales gate). Consider ISO 27001 for global buyers.
- **KYC/AML** — bank-branded capability intersects AML/CTF and KYB duties; retain audit logs to support
  law-enforcement cooperation.

## 5. Secure storage, encryption, access control

- **AES-256 at rest** (FIPS 197; FIPS 140-3 validated modules), **TLS 1.3 in transit**.
- **RBAC + MFA** on all admin/issuer accounts. **HSM/KMS** key management, keys stored separately from data.
- Centralized logging/SIEM, immutable audit trails, penetration testing, staff background checks +
  confidentiality agreements, subprocessor list with 30-day change notice.
- Encrypt documents in R2/S3 with **per-tenant keys** where feasible; **presigned, short-lived** download URLs.

## 6. Why this matters (context, verified sources)

- FTC Consumer Sentinel (news release, Mar 10 2025): consumers reported losing **>$12.5B to fraud in
  2024**, a 25% YoY increase.
- Cotality (formerly CoreLogic) 2025 Annual Fraud Report: ~**0.86% of mortgage applications** carry
  fraud risk (~1 in 116); **income misrepresentation is 46%** of investigated cases — bank statements are
  the primary vehicle.
- AI-generated synthetic statements (no manipulation artifacts) are the 2026 emerging threat — another
  reason provenance (C2PA) and issuer-side verification (QR portal) matter more than artifact detection.

## 7. Legal posture (action items)

- Retain counsel to draft **ToS, Acceptable-Use Policy, and law-enforcement-cooperation policy**.
- Sign **DPAs** with customers; maintain subprocessor list.
- Consider geofencing / enhanced verification for highest-risk document types.

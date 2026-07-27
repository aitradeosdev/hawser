# Hawser DEVLOG

## 2026-07-27 — Full build from clean slate

The repository was cleared of the previous project's files and Hawser was
built end to end in one pass, following the build-and-design plan.

### Created

- **Scaffold** — `package.json` (Next.js 16, React 19, supabase-js),
  `tsconfig.json`, `next.config.ts`, `.gitignore`, `.env.example` with every
  tunable exposed as an environment variable.
- **Imagery** (`public/images/`) — generated via Pollinations (Flux), all
  free to use: `harbour-night.png` (hero backdrop), `rope-strands.png` and
  `bollard-hitch.png` (how-it-works figures), `icon-256.png` / `icon-512.png`
  / `apple-touch-icon.png` (PWA icons), `og-image.png` (social card).
- **Core lib** (`lib/`) — `config.ts` (all tunables, env-driven, no magic
  numbers elsewhere), `copy.ts` (every user-facing string, nautical term
  paired with plain language), `codes.ts` (NATO word + four digits; mint,
  parse, split), `format.ts`, `platform.ts` (device labels), `supabase.ts`
  (client factory, Realtime only), `types.ts` (state machine + wire frames).
- **`lib/session.ts`** — `HawserSession`: the whole state machine in one
  class outside React. Presence-gated pairing (first-sync occupancy check,
  re-mint on collision, third-device rejection), deterministic offerer by
  lower peerId, trickle ICE with pre-remote-description queueing, pending
  offer buffer, 20 s connect timeout, DIRECT/RELAYED detection from ICE
  stats, 16 KiB chunked transfer with bufferedAmount backpressure
  (1 MiB high / 256 KiB low), end/ack handshake, peer-leave handling in
  every phase, object-URL lifecycle.
- **React layer** — `hooks/useHawser.ts` (thin snapshot binding, pagehide
  teardown), `components/Rope.tsx` (SVG quadratic whose control-point Y is
  the only animated value; spring runs outside React; bead position is the
  progress bar; hatch pattern on failure; reduced-motion renders taut),
  `CodeInput.tsx` (word picker + digit slots, paste fills both),
  `Landing.tsx`, `SessionView.tsx` (drop zone, large-file confirm, live
  regions), `TransferList.tsx`.
- **App shell** — `app/layout.tsx` (Familjen Grotesk / Public Sans / DM
  Mono via next/font, PWA + OG meta, viewport-fit cover), `app/page.tsx`,
  `app/manifest.ts`, `app/globals.css` (Harbour Night tokens; kilo yellow
  on exactly two things), `app/api/heartbeat/route.ts` (the only server
  code: daily Supabase keepalive), `vercel.json` (cron),
  `supabase/setup.sql` (heartbeat table + optional Realtime Authorization
  policy).

### Verified live (same day)

- `.env` filled: Supabase project, Metered TURN (config upgraded from a
  single `NEXT_PUBLIC_TURN_URL` to comma-separated `NEXT_PUBLIC_TURN_URLS`
  sharing one credential pair), generated `CRON_SECRET`.
- `uid()` given a non-secure-context fallback so LAN testing over plain
  http works (`crypto.randomUUID` needs https/localhost).
- Added `scripts/e2e-smoke.mjs` (+ `npm run test:e2e`, playwright-core
  driving system Edge): two isolated browser contexts pair over the real
  Supabase channel, transfer 2 MB over the data channel, verify every byte,
  and propagate cast-off. **PASS on first run: MADE FAST · DIRECT,
  QUEBEC-4689, payload intact.**

### Ultracode review (same day)

22-agent workflow: 6 dimension reviewers (signaling, transfer engine,
React/UI, failure paths, requirements compliance, deploy config), each
finding adversarially verified by an independent skeptic. 16 raised,
13 confirmed, 3 refuted. All 13 fixed:

- `lib/session.ts` — guest arms the 20 s connect timer at join (backstop
  for every pre-gate race); gate() fails a guest cleanly on a crowded or
  emptied room instead of stranding it in "passing"; failWith() respects a
  deliberate cast-off; pump() distinguishes line-drop from file-scoped
  errors (unreadable file, missing ack) — drops the file, surfaces a
  notice, keeps the queue moving; sendOne closes out an unreadable file
  with an end frame so the receiver isn't left dangling; one-shot notices
  reset on each new transfer.
- `hooks/useHawser.ts` — pageshow handler resets to landing after a
  bfcache restore (pagehide had destroyed the session).
- `components/SessionView.tsx` — dragleave only clears the highlight when
  the pointer truly leaves the container.
- `components/CodeInput.tsx` — digits are selectable/overtypable
  (maxLength removed, select-on-focus).
- Images re-encoded as true PNGs (they were JPEG bytes with .png names);
  og-image resized to its declared 1200x630; Landing dimensions corrected
  to intrinsic 940x627.
- All remaining hardcoded strings moved into `lib/copy.ts`; the "16 KiB"
  landing copy now derives from `config.chunkBytes` (new
  `formatBinaryBytes`).
- `.site-header` absorbs `env(safe-area-inset-top)` for iOS standalone.

Re-verified after fixes: `tsc` clean, production build clean, e2e smoke
PASS (FOXTROT-2370, 2 MB intact, cast-off propagated).

### Decisions

- No API routes on the hot path; signaling is entirely client-side over one
  Realtime channel per code.
- Session logic lives in a plain class emitting immutable snapshots; React
  only renders them. Progress emissions throttled to 100 ms.
- Failure carries no colour of its own — the rope goes slack with a hatch
  across it; copy stays plain and specific.

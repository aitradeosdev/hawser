# Hawser

> haw-ser, noun: a thick rope passed directly between two vessels to moor or
> tow. Laid from many strands. Handled by two crews, no one in between.

Browser-to-browser file transfer. Two devices call the same code, a WebRTC
data channel opens between them, and bytes move directly from one to the
other. Nothing is uploaded, nothing is stored.

Works on iPhone, Android, macOS, Windows, Linux — anything with a modern
browser, Safari included.

## How it works

```
Device A ─────┐                                  ┌───── Device B
              │      Supabase Realtime           │
              └──►  channel: hawser:KILO-7742 ◄──┘
                    presence + broadcast
                    (no tables, no API routes on the hot path)
              ┌═══════════════════════════════════┐
              └══ RTCDataChannel — file bytes ════┘
                        direct
```

- Pairing codes are one NATO alphabet word plus four digits (`KILO-7742`) —
  something you can say over a phone without spelling it out.
- Signaling (offer/answer/ICE) rides a Supabase Realtime channel entirely
  client-side. Presence gates the room to exactly two devices.
- File bytes ride an ordered RTCDataChannel in 16 KiB frames with mandatory
  backpressure. The signaling service never sees the file.
- `DIRECT` vs `RELAYED` is read from the selected ICE candidate pair and
  shown plainly on the line.

## Setup

1. **Supabase** — create a free project, then run `supabase/setup.sql` in the
   SQL editor. That creates the one-row `heartbeat` table used by the daily
   keepalive (the free tier pauses after 7 idle days; Realtime traffic may
   not count as activity).
2. **Environment** — copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required)
   - TURN credentials (strongly recommended — without a relay, some network
     pairs will never connect and fail at the 20 s timeout)
   - `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (server-only, for the
     keepalive route)
   - Every transfer tunable (chunk size, buffer thresholds, timeouts) is
     also an environment variable; see `.env.example` for defaults.
3. **Run** — `npm install && npm run dev`, then open two browsers. Test real
   transfers across two devices, not two tabs.
4. **Deploy** — push to Vercel. `vercel.json` schedules the daily heartbeat
   cron at `/api/heartbeat`.

## Honest constraints

- No TURN configured means some pairs silently never connect; the UI fails
  at the timeout with plain words.
- Received files are assembled in tab memory; the app warns above the
  configured threshold (default 500 MB) before sending.
- The anon key ships to the browser by design. `supabase/setup.sql` includes
  an optional Realtime Authorization policy to fence channels to `hawser:*`.

## Stack

Next.js (App Router) · Supabase Realtime (signaling only) · WebRTC data
channels · plain CSS · Vercel.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Daily keepalive, hit by Vercel Cron. Supabase's free tier pauses a
 * project after seven days without database activity, and Realtime
 * broadcast traffic may not count — so one row gets touched once a day.
 * This is the only server-side code in the app.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json(
      { ok: false, reason: "missing configuration" },
      { status: 500 },
    );
  }

  const response = await fetch(`${url}/rest/v1/heartbeat?id=eq.1`, {
    method: "PATCH",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({ beat_at: new Date().toISOString() }),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { ok: false, upstream: response.status },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}

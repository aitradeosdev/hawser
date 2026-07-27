function readNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function readList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw) return fallback;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : fallback;
}

export const config = {
  appName: "Hawser",
  tagline: "Pass a line. Send the file.",

  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",

  stunUrls: readList(process.env.NEXT_PUBLIC_STUN_URLS, [
    "stun:stun.l.google.com:19302",
  ]),
  turnUrls: readList(process.env.NEXT_PUBLIC_TURN_URLS, []),
  turnUsername: process.env.NEXT_PUBLIC_TURN_USERNAME ?? "",
  turnCredential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL ?? "",

  chunkBytes: readNumber(process.env.NEXT_PUBLIC_CHUNK_BYTES, 16 * 1024),
  highWaterBytes: readNumber(
    process.env.NEXT_PUBLIC_HIGH_WATER_BYTES,
    1024 * 1024,
  ),
  lowWaterBytes: readNumber(
    process.env.NEXT_PUBLIC_LOW_WATER_BYTES,
    256 * 1024,
  ),
  connectTimeoutMs: readNumber(
    process.env.NEXT_PUBLIC_CONNECT_TIMEOUT_MS,
    20_000,
  ),
  memoryWarnBytes: readNumber(
    process.env.NEXT_PUBLIC_MEMORY_WARN_BYTES,
    500 * 1024 * 1024,
  ),
  realtimeEventsPerSecond: readNumber(
    process.env.NEXT_PUBLIC_REALTIME_EVENTS_PER_SECOND,
    50,
  ),

  channelPrefix: "hawser",
  harbourChannel: "harbour",
  harbourFailThreshold: 2,
  mintAttempts: 6,
  subscribeTimeoutMs: 10_000,
  ackTimeoutMs: 60_000,
  drainPollMs: 250,
  progressEmitMs: 100,
} as const;

export const isConfigured: boolean = Boolean(
  config.supabaseUrl && config.supabaseAnonKey,
);

export function iceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: config.stunUrls }];
  if (config.turnUrls.length > 0) {
    servers.push({
      urls: config.turnUrls,
      username: config.turnUsername,
      credential: config.turnCredential,
    });
  }
  return servers;
}

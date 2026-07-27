import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config, isConfigured } from "@/lib/config";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isConfigured) return null;
  if (!cached) {
    cached = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: {
        params: { eventsPerSecond: config.realtimeEventsPerSecond },
      },
    });
  }
  return cached;
}

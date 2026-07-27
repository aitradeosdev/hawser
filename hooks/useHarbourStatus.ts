"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { config } from "@/lib/config";

export type HarbourState = "checking" | "open" | "full" | "unrigged";

export interface HarbourStatus {
  state: HarbourState;
  aboard: number;
}

function presenceKey(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function useHarbourStatus(): HarbourStatus {
  const [status, setStatus] = useState<HarbourStatus>({
    state: "checking",
    aboard: 0,
  });

  useEffect(() => {
    const client = getSupabase();
    if (!client) {
      setStatus({ state: "unrigged", aboard: 0 });
      return;
    }

    let disposed = false;
    let failures = 0;
    const channel = client.channel(
      `${config.channelPrefix}:${config.harbourChannel}`,
      { config: { presence: { key: presenceKey() } } },
    );

    channel.on("presence", { event: "sync" }, () => {
      if (disposed) return;
      const aboard = Object.keys(channel.presenceState()).length;
      setStatus({ state: "open", aboard });
    });

    channel.subscribe((state) => {
      if (disposed) return;
      if (state === "SUBSCRIBED") {
        failures = 0;
        void channel.track({ at: Date.now() });
        return;
      }
      if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
        failures += 1;
        if (failures >= config.harbourFailThreshold) {
          setStatus({ state: "full", aboard: 0 });
        }
      }
    });

    return () => {
      disposed = true;
      void client.removeChannel(channel);
    };
  }, []);

  return status;
}

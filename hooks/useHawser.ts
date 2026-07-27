"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HawserSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";
import { copy } from "@/lib/copy";
import type { Snapshot } from "@/lib/types";

export const initialSnapshot: Snapshot = {
  phase: "idle",
  code: null,
  role: null,
  path: "unknown",
  selfLabel: copy.deviceFallback,
  peerLabel: null,
  failure: null,
  notice: null,
  castOffDetail: null,
  outbound: null,
  inbound: null,
  queued: 0,
  received: [],
  sent: [],
};

export function useHawser() {
  const sessionRef = useRef<HawserSession | null>(null);
  const [snap, setSnap] = useState<Snapshot>(initialSnapshot);

  const spawn = useCallback((): HawserSession | null => {
    const client = getSupabase();
    if (!client) {
      setSnap({
        ...initialSnapshot,
        phase: "failed",
        failure: copy.failure.notConfigured,
      });
      return null;
    }
    sessionRef.current?.destroy();
    const session = new HawserSession(client, setSnap);
    sessionRef.current = session;
    return session;
  }, []);

  const host = useCallback(() => {
    void spawn()?.host();
  }, [spawn]);

  const join = useCallback(
    (code: string) => {
      void spawn()?.join(code);
    },
    [spawn],
  );

  const sendFiles = useCallback((files: File[]) => {
    sessionRef.current?.sendFiles(files);
  }, []);

  const castOff = useCallback(() => {
    sessionRef.current?.castOff();
  }, []);

  const reset = useCallback(() => {
    sessionRef.current?.destroy();
    sessionRef.current = null;
    setSnap(initialSnapshot);
  }, []);

  useEffect(() => {
    const bail = () => sessionRef.current?.destroy();
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        sessionRef.current = null;
        setSnap(initialSnapshot);
      }
    };
    window.addEventListener("pagehide", bail);
    window.addEventListener("pageshow", restore);
    return () => {
      window.removeEventListener("pagehide", bail);
      window.removeEventListener("pageshow", restore);
      sessionRef.current?.destroy();
      sessionRef.current = null;
    };
  }, []);

  return { snap, host, join, sendFiles, castOff, reset };
}

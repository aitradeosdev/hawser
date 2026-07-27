"use client";

import { Landing } from "@/components/Landing";
import { SessionView } from "@/components/SessionView";
import { useHawser } from "@/hooks/useHawser";
import { isConfigured } from "@/lib/config";

export default function Home() {
  const { snap, host, join, sendFiles, castOff, reset } = useHawser();

  if (snap.phase === "idle") {
    return <Landing configured={isConfigured} onHost={host} onJoin={join} />;
  }

  return (
    <SessionView
      snap={snap}
      onSend={sendFiles}
      onCastOff={castOff}
      onReset={reset}
    />
  );
}

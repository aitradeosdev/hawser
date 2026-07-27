"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { Rope, type RopeMode } from "@/components/Rope";
import { TransferList } from "@/components/TransferList";
import { config } from "@/lib/config";
import { copy } from "@/lib/copy";
import { splitCode } from "@/lib/codes";
import { formatBytes, formatPercent, formatRate } from "@/lib/format";
import type { Snapshot } from "@/lib/types";

interface SessionViewProps {
  snap: Snapshot;
  onSend: (files: File[]) => void;
  onCastOff: () => void;
  onReset: () => void;
}

function ropeModeFor(snap: Snapshot): RopeMode {
  if (snap.phase === "failed") return "failed";
  if (snap.phase === "made-fast") return "taut";
  return "slack";
}

function readoutFor(snap: Snapshot): string {
  switch (snap.phase) {
    case "minting":
      return copy.readout.minting;
    case "hailing":
      return copy.readout.hailing;
    case "passing":
      return copy.readout.passing;
    case "made-fast": {
      if (snap.path === "direct") {
        return `${copy.readout.madeFast} · ${copy.readout.direct}`;
      }
      if (snap.path === "relayed") {
        return `${copy.readout.madeFast} · ${copy.readout.relayed}`;
      }
      return copy.readout.madeFast;
    }
    case "cast-off":
      return copy.readout.castOff;
    case "failed":
      return copy.readout.failed;
    default:
      return "";
  }
}

function sentenceFor(snap: Snapshot): string {
  switch (snap.phase) {
    case "minting":
      return copy.state.minting;
    case "hailing":
      return copy.state.hailing;
    case "passing":
      return copy.state.passing;
    case "made-fast":
      return snap.path === "relayed"
        ? copy.state.madeFastRelay
        : copy.state.madeFast;
    case "cast-off":
      return snap.castOffDetail ?? copy.state.castOffSelf;
    case "failed":
      return snap.failure ?? copy.failure.signalLost;
    default:
      return "";
  }
}

export function SessionView({
  snap,
  onSend,
  onCastOff,
  onReset,
}: SessionViewProps) {
  const [dragging, setDragging] = useState(false);
  const [pendingLarge, setPendingLarge] = useState<File[] | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastReceivedCount = useRef(0);
  const lastSentCount = useRef(0);

  const live = snap.phase === "made-fast";
  const over =
    snap.phase === "cast-off" || snap.phase === "failed";
  const ropeMode = ropeModeFor(snap);
  const active = snap.outbound ?? snap.inbound;
  const progress =
    live && active && active.size > 0 ? active.bytes / active.size : null;
  const sentence = sentenceFor(snap);
  const readout = readoutFor(snap);
  const code = snap.code ? splitCode(snap.code) : null;

  // Announce arrivals and completions for screen readers.
  useEffect(() => {
    if (snap.received.length > lastReceivedCount.current) {
      const latest = snap.received[snap.received.length - 1];
      setAnnouncement(
        copy.announceArrived(latest.name, formatBytes(latest.size)),
      );
    } else if (snap.sent.length > lastSentCount.current) {
      const latest = snap.sent[snap.sent.length - 1];
      setAnnouncement(copy.announceCrossed(latest.name));
    }
    lastReceivedCount.current = snap.received.length;
    lastSentCount.current = snap.sent.length;
  }, [snap.received, snap.sent]);

  const attemptSend = (files: File[]) => {
    if (files.length === 0 || !live) return;
    const largest = files.reduce(
      (max, file) => Math.max(max, file.size),
      0,
    );
    if (largest > config.memoryWarnBytes) {
      setPendingLarge(files);
      return;
    }
    onSend(files);
  };

  const handleDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    attemptSend(Array.from(event.dataTransfer.files));
  };

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    if (!live) return;
    event.preventDefault();
    setDragging(true);
  };

  const handlePick = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    attemptSend(files);
  };

  const showNotice =
    snap.notice !== null && snap.notice !== sentence ? snap.notice : null;

  return (
    <div
      className={`session${dragging ? " session--dragging" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={(event) => {
        // dragleave fires on every child boundary; only clear when the
        // pointer actually leaves the container (or the window).
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDragging(false);
        }
      }}
      onDrop={handleDrop}
    >
      <header className="site-header">
        <span className="wordmark">{copy.wordmark}</span>
        {over ? (
          <button
            type="button"
            className="button button--kilo button--small"
            onClick={onReset}
          >
            {copy.startAgain}
          </button>
        ) : (
          <button
            type="button"
            className="button button--ghost button--small"
            onClick={onCastOff}
          >
            {copy.castOff}
          </button>
        )}
      </header>

      <main className="session__deck">
        <div className="session__berth">
          <div className="session__vessels" aria-hidden="true">
            <span className="session__vessel">{snap.selfLabel}</span>
            <span className="session__vessel session__vessel--far">
              {snap.peerLabel ?? copy.waitingForPeer}
            </span>
          </div>
          <Rope mode={ropeMode} progress={progress} />
        </div>

        <div className="session__caption">
          {code && (
            <p
              className={`session__code${
                snap.phase === "hailing" || snap.phase === "minting"
                  ? " session__code--hailing"
                  : ""
              }`}
            >
              <span className="session__code-word">{code.word}</span>
              <span className="session__code-sep">-</span>
              <span className="session__code-digits">{code.digits}</span>
            </p>
          )}
          {active && live && (
            <p className="session__cargo">
              {active.name} · {formatBytes(active.size)} ·{" "}
              {formatPercent(active.size > 0 ? active.bytes / active.size : 0)}
            </p>
          )}
        </div>

        <div className="session__readout">
          <span
            className={`session__state${
              live ? " session__state--fast" : ""
            }${snap.phase === "failed" ? " session__state--failed" : ""}`}
          >
            {readout}
          </span>
          {active && live && (
            <span className="session__rate">{formatRate(active.rate)}</span>
          )}
          {snap.queued > 0 && (
            <span className="session__queued">
              {snap.queued} {copy.queuedSuffix}
            </span>
          )}
        </div>

        <p className="session__sentence" aria-live="polite">
          {sentence}
        </p>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>

        {showNotice && <p className="session__notice">{showNotice}</p>}

        {pendingLarge && (
          <div
            className="session__warning"
            role="alertdialog"
            aria-label={copy.largeFileWarnLabel}
          >
            <p>
              {copy.memoryWarnSend(
                formatBytes(
                  pendingLarge.reduce(
                    (max, file) => Math.max(max, file.size),
                    0,
                  ),
                ),
              )}
            </p>
            <div className="session__warning-actions">
              <button
                type="button"
                className="button button--kilo button--small"
                onClick={() => {
                  const files = pendingLarge;
                  setPendingLarge(null);
                  onSend(files);
                }}
              >
                {copy.sendAnyway}
              </button>
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={() => setPendingLarge(null)}
              >
                {copy.cancelSend}
              </button>
            </div>
          </div>
        )}

        {live && !pendingLarge && (
          <button
            type="button"
            className="session__drop"
            onClick={() => fileInputRef.current?.click()}
          >
            {copy.dropHint}
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={handlePick}
        />

        <TransferList received={snap.received} sent={snap.sent} />
      </main>
    </div>
  );
}

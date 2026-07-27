import type {
  RealtimeChannel,
  SupabaseClient,
} from "@supabase/supabase-js";
import { config, iceServers } from "@/lib/config";
import { copy } from "@/lib/copy";
import { mintCode, parseCode } from "@/lib/codes";
import { deviceLabel } from "@/lib/platform";
import { formatBytes } from "@/lib/format";
import type {
  ControlFrame,
  PathKind,
  Phase,
  ReceivedFile,
  Role,
  SentFile,
  Snapshot,
  TransferProgress,
} from "@/lib/types";

interface IncomingFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  parts: ArrayBuffer[];
  bytes: number;
  rate: number;
  lastSampleAt: number;
  lastSampleBytes: number;
}

interface PresenceMeta {
  label?: string;
  at?: number;
}

const DATA_CHANNEL_LABEL = "cargo";

function uid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export class HawserSession {
  private readonly supabase: SupabaseClient;
  private readonly onChange: (snap: Snapshot) => void;
  private readonly peerId = uid();

  private channel: RealtimeChannel | null = null;
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;

  private phase: Phase = "idle";
  private code: string | null = null;
  private role: Role | null = null;
  private path: PathKind = "unknown";
  private selfLabel = deviceLabel();
  private peerKey: string | null = null;
  private peerLabel: string | null = null;
  private failure: string | null = null;
  private notice: string | null = null;
  private castOffDetail: string | null = null;

  private started = false;
  private destroyed = false;
  private selfTracked = false;
  private shouldTrack = false;
  private subscribed = false;
  private negotiationStarted = false;
  private firstSyncResolve: (() => void) | null = null;
  private pendingOffer: RTCSessionDescriptionInit | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

  private sendQueue: File[] = [];
  private pumping = false;
  private outbound: TransferProgress | null = null;
  private outboundRateSample = { at: 0, bytes: 0 };
  private ackWaiters = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void }
  >();
  private incoming: IncomingFile | null = null;
  private received: ReceivedFile[] = [];
  private sent: SentFile[] = [];
  private lastProgressEmit = 0;

  constructor(supabase: SupabaseClient, onChange: (snap: Snapshot) => void) {
    this.supabase = supabase;
    this.onChange = onChange;
  }

  async host(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.role = "host";
    this.setPhase("minting");

    for (let attempt = 0; attempt < config.mintAttempts; attempt += 1) {
      if (this.destroyed) return;
      const candidate = mintCode();
      try {
        await this.openAndSubscribe(candidate);
      } catch {
        this.failWith(copy.failure.signalLost);
        return;
      }
      if (this.destroyed) return;
      if (this.otherPeerKeys().length === 0) {
        this.code = candidate;
        this.shouldTrack = true;
        await this.trackPresence();
        this.setPhase("hailing");
        this.gate();
        return;
      }
      await this.teardownChannel();
    }
    this.failWith(copy.failure.mintFailed);
  }

  async join(raw: string): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.role = "guest";

    const code = parseCode(raw);
    if (!code) {
      this.failWith(copy.failure.badCode);
      return;
    }
    this.code = code;
    this.setPhase("passing");
    this.startConnectTimer();

    try {
      await this.openAndSubscribe(code);
    } catch {
      this.failWith(copy.failure.signalLost);
      return;
    }
    if (this.destroyed) return;

    const others = this.otherPeerKeys();
    if (others.length === 0) {
      await this.teardownChannel();
      this.failWith(copy.failure.noOneHailing);
      return;
    }
    if (others.length >= 2) {
      await this.teardownChannel();
      this.failWith(copy.failure.crowded);
      return;
    }

    this.shouldTrack = true;
    await this.trackPresence();
    this.gate();
  }

  sendFiles(files: File[]): void {
    if (files.length === 0) return;
    if (this.phase !== "made-fast") return;
    this.sendQueue.push(...files);
    this.emit();
    void this.pump();
  }

  castOff(): void {
    if (this.phase === "cast-off" || this.phase === "failed") return;
    this.castOffDetail = copy.state.castOffSelf;
    this.setPhase("cast-off");
    void this.teardownRtc();
    void this.teardownChannel();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.rejectAllAcks(new Error("session-destroyed"));
    void this.teardownRtc();
    void this.teardownChannel();
    for (const file of this.received) {
      URL.revokeObjectURL(file.url);
    }
  }

  private openAndSubscribe(code: string): Promise<void> {
    const channel = this.supabase.channel(
      `${config.channelPrefix}:${code}`,
      {
        config: {
          broadcast: { self: false, ack: false },
          presence: { key: this.peerId },
        },
      },
    );

    channel.on("presence", { event: "sync" }, () => this.handlePresenceSync());
    channel.on("presence", { event: "leave" }, (payload) =>
      this.handlePresenceLeave(payload as { key?: string }),
    );
    channel.on("broadcast", { event: "sdp" }, ({ payload }) => {
      void this.handleSdp(payload as { from: string; description: RTCSessionDescriptionInit });
    });
    channel.on("broadcast", { event: "ice" }, ({ payload }) => {
      void this.handleIce(payload as { from: string; candidate: RTCIceCandidateInit });
    });

    this.channel = channel;
    this.subscribed = false;

    const subscribePromise = new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("subscribe-timeout"));
        }
      }, config.subscribeTimeoutMs);

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.subscribed = true;
          if (this.shouldTrack) void this.trackPresence();
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve();
          }
          return;
        }
        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(new Error(status));
            return;
          }
          this.handleChannelDrop();
        }
      });
    });

    const firstSync = new Promise<void>((resolve) => {
      this.firstSyncResolve = resolve;
    });

    return subscribePromise.then(() => firstSync);
  }

  private async trackPresence(): Promise<void> {
    if (!this.channel || this.destroyed) return;
    try {
      await this.channel.track({
        label: this.selfLabel,
        at: Date.now(),
      } satisfies PresenceMeta);
      this.selfTracked = true;
    } catch {
      return;
    }
  }

  private async teardownChannel(): Promise<void> {
    const channel = this.channel;
    this.channel = null;
    this.subscribed = false;
    this.selfTracked = false;
    this.firstSyncResolve = null;
    if (channel) {
      try {
        await this.supabase.removeChannel(channel);
      } catch {
        return;
      }
    }
  }

  private handleChannelDrop(): void {
    if (this.destroyed) return;
    if (this.phase === "made-fast" || this.phase === "cast-off") return;
  }

  private broadcast(event: "sdp" | "ice", payload: unknown): void {
    const channel = this.channel;
    if (!channel || !this.subscribed) return;
    void channel.send({ type: "broadcast", event, payload }).catch(() => {});
  }

  private otherPeerKeys(): string[] {
    if (!this.channel) return [];
    const state = this.channel.presenceState<PresenceMeta>();
    return Object.keys(state).filter((key) => key !== this.peerId);
  }

  private handlePresenceSync(): void {
    if (this.firstSyncResolve) {
      const resolve = this.firstSyncResolve;
      this.firstSyncResolve = null;
      resolve();
    }
    this.gate();
  }

  private gate(): void {
    if (this.destroyed || this.negotiationStarted) return;
    if (!this.selfTracked || !this.channel) return;
    if (this.phase !== "hailing" && this.phase !== "passing") return;
    const others = this.otherPeerKeys();
    if (others.length !== 1) {
      if (this.role === "guest" && others.length === 0) {
        void this.teardownRtc();
        void this.teardownChannel();
        this.failWith(copy.failure.peerLeft);
      } else if (this.role === "guest" && others.length > 1) {
        void this.teardownRtc();
        void this.teardownChannel();
        this.failWith(copy.failure.crowded);
      }
      return;
    }

    const peerKey = others[0];
    this.peerKey = peerKey;
    const state = this.channel.presenceState<PresenceMeta>();
    this.peerLabel = state[peerKey]?.[0]?.label ?? null;

    this.negotiationStarted = true;
    this.setPhase("passing");
    this.startConnectTimer();

    const offerer = this.peerId < peerKey;
    void this.createPeer(offerer);
  }

  private handlePresenceLeave(payload: { key?: string }): void {
    if (this.destroyed) return;
    const key = payload.key;
    if (!key || key === this.peerId) return;
    if (this.peerKey && key !== this.peerKey) return;
    if (!this.peerKey) return;
    this.peerGone();
  }

  private peerGone(): void {
    if (this.phase === "made-fast") {
      this.finishCastOffByPeer();
      return;
    }
    if (this.phase === "passing") {
      if (this.role === "host") {
        void this.teardownRtc();
        this.negotiationStarted = false;
        this.pendingOffer = null;
        this.pendingIce = [];
        this.peerKey = null;
        this.peerLabel = null;
        this.clearConnectTimer();
        this.setPhase("hailing");
      } else {
        this.clearConnectTimer();
        void this.teardownRtc();
        void this.teardownChannel();
        this.failWith(copy.failure.peerLeft);
      }
    }
  }

  private finishCastOffByPeer(): void {
    if (this.phase === "cast-off") return;
    let detail: string = copy.failure.peerLeft;
    if (this.incoming) {
      const missing = this.incoming.size - this.incoming.bytes;
      detail = copy.peerLeftMidReceive(
        formatBytes(Math.max(0, missing)),
        this.incoming.name,
      );
      this.incoming = null;
    } else if (this.outbound) {
      detail = copy.peerLeftMidSend(this.outbound.name);
    }
    this.castOffDetail = detail;
    this.outbound = null;
    this.sendQueue = [];
    this.rejectAllAcks(new Error("peer-left"));
    this.setPhase("cast-off");
    void this.teardownRtc();
    void this.teardownChannel();
  }

  private async createPeer(offerer: boolean): Promise<void> {
    try {
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      this.pc = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.broadcast("ice", {
            from: this.peerId,
            candidate: event.candidate.toJSON(),
          });
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc !== this.pc) return;
        if (pc.connectionState === "failed") {
          this.failConnect();
        }
      };

      if (offerer) {
        const dc = pc.createDataChannel(DATA_CHANNEL_LABEL, { ordered: true });
        this.wireDataChannel(dc);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.broadcast("sdp", {
          from: this.peerId,
          description: { type: offer.type, sdp: offer.sdp },
        });
      } else {
        pc.ondatachannel = (event) => this.wireDataChannel(event.channel);
        if (this.pendingOffer) {
          const offer = this.pendingOffer;
          this.pendingOffer = null;
          await this.acceptOffer(offer);
        }
      }
    } catch {
      this.failConnect();
    }
  }

  private async handleSdp(payload: {
    from: string;
    description: RTCSessionDescriptionInit;
  }): Promise<void> {
    if (this.destroyed || !payload || payload.from === this.peerId) return;
    const description = payload.description;
    if (!description || !description.type) return;
    try {
      if (description.type === "offer") {
        if (!this.pc || !this.negotiationStarted) {
          this.pendingOffer = description;
          this.gate();
          return;
        }
        await this.acceptOffer(description);
      } else if (description.type === "answer") {
        if (!this.pc || this.pc.signalingState !== "have-local-offer") return;
        await this.pc.setRemoteDescription(description);
        await this.flushPendingIce();
      }
    } catch {
      this.failConnect();
    }
  }

  private async acceptOffer(
    offer: RTCSessionDescriptionInit,
  ): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    await pc.setRemoteDescription(offer);
    await this.flushPendingIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.broadcast("sdp", {
      from: this.peerId,
      description: { type: answer.type, sdp: answer.sdp },
    });
  }

  private async handleIce(payload: {
    from: string;
    candidate: RTCIceCandidateInit;
  }): Promise<void> {
    if (this.destroyed || !payload || payload.from === this.peerId) return;
    if (!payload.candidate) return;
    const pc = this.pc;
    if (!pc || !pc.remoteDescription) {
      this.pendingIce.push(payload.candidate);
      return;
    }
    try {
      await pc.addIceCandidate(payload.candidate);
    } catch {
      return;
    }
  }

  private async flushPendingIce(): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    const queued = this.pendingIce;
    this.pendingIce = [];
    for (const candidate of queued) {
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        continue;
      }
    }
  }

  private wireDataChannel(dc: RTCDataChannel): void {
    this.dc = dc;
    dc.binaryType = "arraybuffer";
    dc.bufferedAmountLowThreshold = config.lowWaterBytes;
    dc.onopen = () => this.handleLineFast();
    dc.onmessage = (event) => this.handleMessage(event.data);
    dc.onclose = () => this.handleLineClosed();
    dc.onerror = () => {};
  }

  private handleLineFast(): void {
    if (this.destroyed) return;
    this.clearConnectTimer();
    this.setPhase("made-fast");
    void this.detectPath();
    void this.pump();
  }

  private handleLineClosed(): void {
    if (this.destroyed) return;
    if (this.phase === "made-fast") {
      this.finishCastOffByPeer();
    }
  }

  private async detectPath(): Promise<void> {
    const pc = this.pc;
    if (!pc) return;
    try {
      const stats = await pc.getStats();
      let selectedPairId: string | null = null;
      let selectedPair: Record<string, unknown> | null = null;

      stats.forEach((report) => {
        const r = report as unknown as Record<string, unknown>;
        if (r.type === "transport" && typeof r.selectedCandidatePairId === "string") {
          selectedPairId = r.selectedCandidatePairId;
        }
      });
      stats.forEach((report) => {
        const r = report as unknown as Record<string, unknown>;
        if (r.type !== "candidate-pair") return;
        if (selectedPairId && r.id === selectedPairId) {
          selectedPair = r;
        } else if (
          !selectedPairId &&
          r.state === "succeeded" &&
          (r.nominated === true || r.selected === true)
        ) {
          selectedPair = r;
        }
      });

      if (!selectedPair) return;
      const pair = selectedPair as Record<string, unknown>;
      const local = stats.get(pair.localCandidateId as string) as
        | Record<string, unknown>
        | undefined;
      const remote = stats.get(pair.remoteCandidateId as string) as
        | Record<string, unknown>
        | undefined;
      const relayed =
        local?.candidateType === "relay" || remote?.candidateType === "relay";
      this.path = relayed ? "relayed" : "direct";
      if (relayed) {
        this.notice = copy.state.madeFastRelay;
      }
      this.emit();
    } catch {
      return;
    }
  }

  private startConnectTimer(): void {
    this.clearConnectTimer();
    this.connectTimer = setTimeout(() => {
      this.failConnect();
    }, config.connectTimeoutMs);
  }

  private clearConnectTimer(): void {
    if (this.connectTimer !== null) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  private failConnect(): void {
    if (this.destroyed || this.phase === "made-fast") return;
    if (this.phase === "failed" || this.phase === "cast-off") return;
    this.clearConnectTimer();
    void this.teardownRtc();
    void this.teardownChannel();
    this.failWith(copy.failure.noPath);
  }

  private async teardownRtc(): Promise<void> {
    const dc = this.dc;
    const pc = this.pc;
    this.dc = null;
    this.pc = null;
    if (dc) {
      dc.onopen = null;
      dc.onmessage = null;
      dc.onclose = null;
      dc.onerror = null;
      try {
        dc.close();
      } catch {}
    }
    if (pc) {
      pc.onicecandidate = null;
      pc.onconnectionstatechange = null;
      pc.ondatachannel = null;
      try {
        pc.close();
      } catch {
        return;
      }
    }
  }

  private async pump(): Promise<void> {
    if (this.pumping) return;
    this.pumping = true;
    try {
      while (
        this.sendQueue.length > 0 &&
        this.dc?.readyState === "open" &&
        !this.destroyed
      ) {
        const file = this.sendQueue[0];
        try {
          await this.sendOne(file);
          this.sendQueue.shift();
        } catch (err) {
          if (this.destroyed || this.dc?.readyState !== "open") {
            break;
          }
          this.sendQueue.shift();
          this.outbound = null;
          this.notice =
            err instanceof Error && err.message === "ack-timeout"
              ? copy.sendNoReceipt(file.name)
              : copy.sendUnreadable(file.name);
          this.emit();
        }
      }
    } finally {
      this.pumping = false;
      this.emit();
    }
  }

  private async sendOne(file: File): Promise<void> {
    const dc = this.dc;
    if (!dc || dc.readyState !== "open") throw new Error("line-not-fast");

    const id = uid();
    const start: ControlFrame = {
      t: "start",
      id,
      name: file.name,
      size: file.size,
      mime: file.type,
    };
    dc.send(JSON.stringify(start));

    this.outbound = { id, name: file.name, size: file.size, bytes: 0, rate: 0 };
    this.outboundRateSample = { at: performance.now(), bytes: 0 };
    this.notice = this.path === "relayed" ? copy.state.madeFastRelay : null;
    this.emit();

    let offset = 0;
    while (offset < file.size) {
      if (this.destroyed || dc.readyState !== "open") {
        throw new Error("line-dropped");
      }
      if (dc.bufferedAmount > config.highWaterBytes) {
        await this.drained(dc);
        continue;
      }
      let chunk: ArrayBuffer;
      try {
        chunk = await file
          .slice(offset, offset + config.chunkBytes)
          .arrayBuffer();
      } catch {
        try {
          dc.send(JSON.stringify({ t: "end", id } satisfies ControlFrame));
        } catch {
          throw new Error("file-unreadable");
        }
        throw new Error("file-unreadable");
      }
      if (this.destroyed || dc.readyState !== "open") {
        throw new Error("line-dropped");
      }
      dc.send(chunk);
      offset += chunk.byteLength;
      this.progressOutbound(offset, offset >= file.size);
    }

    const end: ControlFrame = { t: "end", id };
    dc.send(JSON.stringify(end));
    await this.waitForAck(id);

    this.sent = [...this.sent, { id, name: file.name, size: file.size }];
    this.outbound = null;
    this.emit();
  }

  private drained(dc: RTCDataChannel): Promise<void> {
    return new Promise((resolve) => {
      let settled = false;
      let poll: ReturnType<typeof setInterval> | null = null;
      const finish = () => {
        if (settled) return;
        settled = true;
        dc.removeEventListener("bufferedamountlow", finish);
        if (poll !== null) clearInterval(poll);
        resolve();
      };
      dc.addEventListener("bufferedamountlow", finish);
      poll = setInterval(() => {
        if (
          dc.bufferedAmount <= config.lowWaterBytes ||
          dc.readyState !== "open" ||
          this.destroyed
        ) {
          finish();
        }
      }, config.drainPollMs);
    });
  }

  private waitForAck(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.ackWaiters.delete(id);
        reject(new Error("ack-timeout"));
      }, config.ackTimeoutMs);
      this.ackWaiters.set(id, {
        resolve: () => {
          clearTimeout(timer);
          this.ackWaiters.delete(id);
          resolve();
        },
        reject: (err: Error) => {
          clearTimeout(timer);
          this.ackWaiters.delete(id);
          reject(err);
        },
      });
    });
  }

  private rejectAllAcks(err: Error): void {
    const waiters = [...this.ackWaiters.values()];
    this.ackWaiters.clear();
    for (const waiter of waiters) {
      waiter.reject(err);
    }
  }

  private progressOutbound(bytes: number, final: boolean): void {
    if (!this.outbound) return;
    const now = performance.now();
    const sample = this.outboundRateSample;
    const dt = (now - sample.at) / 1000;
    if (dt > 0.2 || final) {
      const instant = (bytes - sample.bytes) / Math.max(dt, 0.001);
      this.outbound.rate =
        this.outbound.rate > 0
          ? this.outbound.rate * 0.7 + instant * 0.3
          : instant;
      this.outboundRateSample = { at: now, bytes };
    }
    this.outbound.bytes = bytes;
    this.emitProgress(final);
  }

  private handleMessage(data: unknown): void {
    if (typeof data === "string") {
      let frame: ControlFrame | null = null;
      try {
        frame = JSON.parse(data) as ControlFrame;
      } catch {
        return;
      }
      if (frame && typeof frame === "object" && "t" in frame) {
        this.handleControl(frame);
      }
      return;
    }
    if (data instanceof ArrayBuffer) {
      this.handleChunk(data);
    }
  }

  private handleControl(frame: ControlFrame): void {
    switch (frame.t) {
      case "start": {
        if (typeof frame.size !== "number" || frame.size < 0) return;
        const name =
          typeof frame.name === "string" && frame.name.trim()
            ? frame.name
            : "unnamed";
        this.incoming = {
          id: String(frame.id),
          name,
          size: frame.size,
          mime: typeof frame.mime === "string" ? frame.mime : "",
          parts: [],
          bytes: 0,
          rate: 0,
          lastSampleAt: performance.now(),
          lastSampleBytes: 0,
        };
        this.notice =
          this.path === "relayed" ? copy.state.madeFastRelay : null;
        if (frame.size > config.memoryWarnBytes) {
          this.notice = copy.memoryWarnReceive(formatBytes(frame.size), name);
        }
        this.emit();
        break;
      }
      case "end": {
        const incoming = this.incoming;
        if (!incoming || String(frame.id) !== incoming.id) return;
        this.incoming = null;
        const blob = new Blob(incoming.parts, {
          type: incoming.mime || "application/octet-stream",
        });
        const short = incoming.bytes < incoming.size;
        if (short) {
          this.notice = copy.shortDelivery(incoming.name);
        }
        const file: ReceivedFile = {
          id: incoming.id,
          name: incoming.name,
          size: incoming.bytes,
          mime: incoming.mime,
          url: URL.createObjectURL(blob),
          short,
        };
        this.received = [...this.received, file];
        const ack: ControlFrame = { t: "ack", id: incoming.id };
        try {
          this.dc?.send(JSON.stringify(ack));
        } catch {}
        this.emit();
        break;
      }
      case "ack": {
        const waiter = this.ackWaiters.get(String(frame.id));
        if (waiter) waiter.resolve();
        break;
      }
      default:
        break;
    }
  }

  private handleChunk(chunk: ArrayBuffer): void {
    const incoming = this.incoming;
    if (!incoming) return;
    incoming.parts.push(chunk);
    incoming.bytes += chunk.byteLength;

    const now = performance.now();
    const dt = (now - incoming.lastSampleAt) / 1000;
    if (dt > 0.2) {
      const instant =
        (incoming.bytes - incoming.lastSampleBytes) / Math.max(dt, 0.001);
      incoming.rate =
        incoming.rate > 0 ? incoming.rate * 0.7 + instant * 0.3 : instant;
      incoming.lastSampleAt = now;
      incoming.lastSampleBytes = incoming.bytes;
    }
    this.emitProgress(incoming.bytes >= incoming.size);
  }

  private setPhase(phase: Phase): void {
    this.phase = phase;
    this.emit();
  }

  private failWith(message: string): void {
    if (this.destroyed) return;
    if (this.phase === "cast-off") return;
    this.clearConnectTimer();
    this.failure = message;
    this.setPhase("failed");
  }

  private emitProgress(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastProgressEmit < config.progressEmitMs) return;
    this.lastProgressEmit = now;
    this.emit();
  }

  private emit(): void {
    if (this.destroyed) return;
    const incoming = this.incoming;
    const snapshot: Snapshot = {
      phase: this.phase,
      code: this.code,
      role: this.role,
      path: this.path,
      selfLabel: this.selfLabel,
      peerLabel: this.peerLabel,
      failure: this.failure,
      notice: this.notice,
      castOffDetail: this.castOffDetail,
      outbound: this.outbound ? { ...this.outbound } : null,
      inbound: incoming
        ? {
            id: incoming.id,
            name: incoming.name,
            size: incoming.size,
            bytes: incoming.bytes,
            rate: incoming.rate,
          }
        : null,
      queued: Math.max(0, this.sendQueue.length - (this.outbound ? 1 : 0)),
      received: [...this.received],
      sent: [...this.sent],
    };
    this.onChange(snapshot);
  }
}

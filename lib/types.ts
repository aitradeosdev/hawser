export type Phase =
  | "idle"
  | "minting"
  | "hailing"
  | "passing"
  | "made-fast"
  | "cast-off"
  | "failed";

export type PathKind = "direct" | "relayed" | "unknown";

export type Role = "host" | "guest";

export interface TransferProgress {
  id: string;
  name: string;
  size: number;
  bytes: number;
  rate: number;
}

export interface ReceivedFile {
  id: string;
  name: string;
  size: number;
  mime: string;
  url: string;
  short: boolean;
}

export interface SentFile {
  id: string;
  name: string;
  size: number;
}

export interface Snapshot {
  phase: Phase;
  code: string | null;
  role: Role | null;
  path: PathKind;
  selfLabel: string;
  peerLabel: string | null;
  failure: string | null;
  notice: string | null;
  castOffDetail: string | null;
  outbound: TransferProgress | null;
  inbound: TransferProgress | null;
  queued: number;
  received: ReceivedFile[];
  sent: SentFile[];
}

export type ControlFrame =
  | { t: "start"; id: string; name: string; size: number; mime: string }
  | { t: "end"; id: string }
  | { t: "ack"; id: string };

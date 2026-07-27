import { config } from "@/lib/config";
import { formatBinaryBytes } from "@/lib/format";

const chunkLabel = formatBinaryBytes(config.chunkBytes);

export const copy = {
  wordmark: "HAWSER",
  heroLineOne: "Pass a line.",
  heroLineTwo: "Send the file.",
  heroSub:
    "Two devices, one rope, nothing in between. Your file never touches a server.",

  ctaHost: "Pass a line",
  ctaJoin: "Take the line",
  joinLegend: "Have a code? Enter it here.",
  codeWordLabel: "Code word",
  codeWordPlaceholder: "WORD",
  codeDigitLabel: (n: number, total: number): string =>
    `Code digit ${n} of ${total}`,

  howLink: "How it works",
  proofAria: "What Hawser promises",
  proofStrip: [
    { figure: "0 bytes", caption: "stored on any server" },
    { figure: "1 line", caption: "device to device" },
    { figure: "260,000", caption: "speakable codes" },
    { figure: chunkLabel, caption: "frames, hawser-laid" },
  ],

  figures: {
    ropeAlt:
      "Close view of a hawser-laid rope, three strands twisted into one line",
    ropeCaption: `Hawser-laid: many strands, one line. Files cross the same way, in ${chunkLabel} pieces.`,
    bollardAlt: "A mooring rope made fast around an iron dock bollard at night",
    bollardCaption:
      "Made fast: tied off and secure. The channel is encrypted end to end.",
    heroAlt:
      "A harbour quay in morning light, mooring ropes made fast around iron bollards",
  },

  howEyebrow: "how it goes",
  howTitle: "Three moves, no account.",
  howSteps: [
    {
      term: "Hail",
      plain: "Open Hawser on both devices. One mints a code you can say out loud.",
    },
    {
      term: "Make fast",
      plain:
        "The other device enters the code. A direct line opens between the two browsers.",
    },
    {
      term: "Work cargo",
      plain:
        "Drop a file on either side. It crosses the line in pieces and lands whole.",
    },
  ],

  glossaryEyebrow: "the vocabulary",
  glossaryTitle: "Handled by two crews, no one in between.",
  glossaryBody:
    "A hawser is a thick rope passed directly between two vessels to moor or tow. It is hawser-laid: many strands twisted into one line. That is what this app does with your file.",
  glossaryTerms: [
    { term: "Hailing", plain: "Waiting for the second device" },
    { term: "Line passed", plain: "Connection offer exchanged" },
    { term: "Made fast", plain: "The channel is open and secure" },
    { term: "Working cargo", plain: "Transfer running" },
    { term: "Cast off", plain: "Session ended" },
  ],

  harbour: {
    checking: "SOUNDING THE HARBOUR",
    open: (aboard: number): string =>
      aboard === 1 ? "HARBOUR OPEN · 1 ABOARD" : `HARBOUR OPEN · ${aboard} ABOARD`,
    full: "HARBOUR FULL",
    fullDetail:
      "The harbour is at capacity right now. Lines cannot be passed until a berth frees up. Try again shortly.",
  },

  state: {
    idle: "Nothing sent yet. Drop a file anywhere on this page.",
    minting: "Minting a code.",
    hailing: "Hailing. Give the other device this code.",
    passing: "Line passed. Making fast.",
    madeFast: "Made fast. Drop a file anywhere.",
    madeFastRelay:
      "Made fast, but routed through a relay. Slower. Still encrypted end to end.",
    castOffSelf: "Cast off. Lines released.",
  },

  failure: {
    notConfigured:
      "Hawser is not rigged yet. Set the Supabase environment variables and reload.",
    badCode: "That is not a Hawser code. One word, four digits.",
    noOneHailing: "No one is hailing on that code. Check it and try again.",
    crowded: "Two vessels already hold this line. A hawser takes exactly two.",
    mintFailed: "Could not find a free code. Try again in a moment.",
    signalLost:
      "Couldn't reach the harbour. It may be at capacity. Try again shortly.",
    noPath:
      "This network won't pass a line. Try both devices on the same Wi-Fi.",
    peerLeft: "The other device cast off.",
  },

  peerLeftMidReceive: (missing: string, name: string): string =>
    `The other device cast off. ${missing} of ${name} didn't arrive.`,
  peerLeftMidSend: (name: string): string =>
    `The other device cast off before ${name} finished crossing.`,
  shortDelivery: (name: string): string =>
    `${name} arrived short of its declared size. Treat it with suspicion.`,
  sendUnreadable: (name: string): string =>
    `Couldn't send ${name}. The file changed or became unreadable on disk. Pick it again.`,
  sendNoReceipt: (name: string): string =>
    `No receipt for ${name} from the other side. It was sent, but delivery is unconfirmed.`,
  memoryWarnReceive: (size: string, name: string): string =>
    `${name} is ${size}. It is held in this tab's memory until saved; large files can sink a phone browser.`,
  memoryWarnSend: (size: string): string =>
    `This file is ${size}. The receiving device holds it in memory until saved; large files can sink a phone browser.`,

  sendAnyway: "Send anyway",
  cancelSend: "Stand down",
  castOff: "Cast off",
  startAgain: "Back to the quay",
  save: "Save",
  dropHint: "Drop a file anywhere, or tap to choose.",
  waitingForPeer: "Waiting for the second device.",
  thisDevice: "This device",
  deviceFallback: "Device",
  queuedSuffix: "waiting to cross",
  largeFileWarnLabel: "Large file warning",

  manifest: {
    receivedHeading: "Landed here",
    sentHeading: "Crossed over",
    ariaReceived: "Files received",
    ariaSent: "Files sent",
  },
  announceArrived: (name: string, size: string): string =>
    `${name} arrived. ${size}.`,
  announceCrossed: (name: string): string => `${name} crossed over.`,

  readout: {
    minting: "MINTING",
    hailing: "HAILING",
    passing: "LINE PASSED",
    madeFast: "MADE FAST",
    castOff: "CAST OFF",
    failed: "NO LINE",
    direct: "DIRECT",
    relayed: "RELAYED",
  },

  nav: {
    privacy: "Privacy",
    terms: "Terms of use",
    backHome: "Back to the quay",
  },

  footerNote:
    "Files move browser to browser over an encrypted WebRTC data channel. The signaling service sees the code and the connection offer, never the file.",
} as const;

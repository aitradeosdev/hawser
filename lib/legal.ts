export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const privacyDoc: LegalDoc = {
  slug: "privacy",
  title: "Privacy",
  updated: "Last updated 27 July 2026",
  intro:
    "Hawser moves files directly between two browsers. It was built so that there is almost nothing to have a privacy policy about. This page explains exactly what passes through which systems, in plain language.",
  sections: [
    {
      heading: "Your files",
      paragraphs: [
        "Files travel over an encrypted WebRTC data channel directly from one device to the other. They are never uploaded to, stored on, or readable by any server operated for Hawser.",
        "On the receiving device, a file is held in browser memory until you save it. Closing the tab discards it. Nothing is written anywhere else.",
      ],
    },
    {
      heading: "What the signaling service sees",
      paragraphs: [
        "To introduce the two browsers to each other, Hawser uses a realtime messaging channel (Supabase Realtime). While pairing, it carries: the session code, a short device label such as iPhone or Windows, and the WebRTC connection offer, which includes network addresses of your devices. This is standard for any WebRTC application.",
        "These messages exist only in transit. Hawser keeps no database of sessions, codes, transfers, or visitors. The only stored record anywhere is a single timestamp row used to keep the free-tier project awake, and it contains no user data.",
      ],
    },
    {
      heading: "Relay servers",
      paragraphs: [
        "Some networks block direct device-to-device connections. In that case traffic is routed through a TURN relay server. The relay forwards encrypted bytes; it cannot read your file, because encryption is end to end between the two browsers. The interface tells you plainly when a transfer is relayed.",
      ],
    },
    {
      heading: "No accounts, no tracking",
      paragraphs: [
        "There are no accounts, no sign-ins, no analytics, no advertising, and no cookies set by Hawser. Fonts are bundled with the app and are not fetched from third parties at runtime.",
      ],
    },
    {
      heading: "Questions",
      paragraphs: [
        "Hawser is a small, open tool. If you have a question about how something works, the source code is the authoritative answer, and this page will be kept honest against it.",
      ],
    },
  ],
};

export const termsDoc: LegalDoc = {
  slug: "terms",
  title: "Terms of use",
  updated: "Last updated 27 July 2026",
  intro:
    "Hawser is provided as a simple tool for moving files between two devices you control or between people who trust each other. Using it means agreeing to the points below.",
  sections: [
    {
      heading: "What you may use it for",
      paragraphs: [
        "You may use Hawser to transfer files you have the right to share. You are responsible for what you send and what you accept. Do not use Hawser to distribute unlawful content or to infringe the rights of others.",
      ],
    },
    {
      heading: "How transfers work",
      paragraphs: [
        "Transfers are direct between browsers and are not inspected, filtered, or moderated. There is no way for the service to see the contents of a transfer, and accordingly no ability to recover a file after a session ends. Verify the code with the other person before taking a line; anyone holding a valid code during its short life can join the session.",
      ],
    },
    {
      heading: "Availability",
      paragraphs: [
        "The service is offered as is, with no promise of availability, speed, or fitness for a particular purpose. Sessions can fail on restrictive networks, the harbour can be at capacity, and the service may change or stop at any time.",
      ],
    },
    {
      heading: "No warranty, limited liability",
      paragraphs: [
        "To the fullest extent permitted by law, Hawser is provided without warranties of any kind, and its operators are not liable for any loss arising from its use, including lost, corrupted, or misdelivered files. Keep your own copies of anything important.",
      ],
    },
    {
      heading: "Changes",
      paragraphs: [
        "These terms may be updated as the tool evolves. The date above reflects the current version; continued use after a change means acceptance of the updated terms.",
      ],
    },
  ],
};

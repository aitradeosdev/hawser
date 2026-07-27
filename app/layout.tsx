import type { Metadata, Viewport } from "next";
import { DM_Mono, Familjen_Grotesk, Public_Sans } from "next/font/google";
import { config } from "@/lib/config";
import "./globals.css";

const display = Familjen_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
});

const body = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const mono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: config.siteUrl ? new URL(config.siteUrl) : undefined,
  title: `${config.appName} — pass a line, send the file`,
  description:
    "Browser-to-browser file transfer. Two devices call the same code, a direct encrypted line opens between them, and the file crosses. Nothing is uploaded, nothing is stored.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/images/icon-256.png",
    apple: "/images/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: config.appName,
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: `${config.appName} — pass a line, send the file`,
    description:
      "Direct device-to-device file transfer, paired by a code you can say out loud. Your file never touches a server.",
    type: "website",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${config.appName} — pass a line, send the file`,
    description:
      "Direct device-to-device file transfer, paired by a code you can say out loud.",
    images: ["/images/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#101418",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}

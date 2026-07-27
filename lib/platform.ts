import { copy } from "@/lib/copy";

export function deviceLabel(): string {
  if (typeof navigator === "undefined") return copy.deviceFallback;
  const ua = navigator.userAgent;
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return "iPad";
  }
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Macintosh|Mac OS X/.test(ua)) return "Mac";
  if (/CrOS/.test(ua)) return "Chromebook";
  if (/Linux/.test(ua)) return "Linux";
  return copy.deviceFallback;
}

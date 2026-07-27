import type { MetadataRoute } from "next";
import { config } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.appName,
    short_name: config.appName,
    description: config.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#101418",
    theme_color: "#101418",
    icons: [
      {
        src: "/images/icon-256.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/images/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

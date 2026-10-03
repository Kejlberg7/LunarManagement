import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lunar Holdmanager",
    short_name: "Lunar Hold",
    description: "Kampplan og tilgængelighed for Lunar Ligaen.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f2",
    theme_color: "#f4f6f2",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shelfmark",
    short_name: "Shelfmark",
    description: "Find a legitimate way to read a book.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2eee5",
    theme_color: "#163d31",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

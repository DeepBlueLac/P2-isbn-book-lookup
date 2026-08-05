import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Shelfmark",
    short_name: "Shelfmark",
    description: "Search by ISBN, title, or author and find downloadable book file options faster.",
    start_url: "/",
    display: "standalone",
    background_color: "#f2eee5",
    theme_color: "#163d31",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}

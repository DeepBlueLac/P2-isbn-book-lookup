import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.deepbluelac.isbnlookup",
  appName: "书目",
  webDir: "out",
  server: {
    androidScheme: "https",
  },
};

export default config;

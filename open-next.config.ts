import {
  defineCloudflareConfig,
  type OpenNextConfig,
} from "@opennextjs/cloudflare";

const cloudflareConfig: OpenNextConfig = {
  ...defineCloudflareConfig(),
  buildCommand:
    "npx cross-env NEXT_PUBLIC_SITE_URL=https://books.bulidoge.site npx next build --webpack",
};

export default cloudflareConfig;

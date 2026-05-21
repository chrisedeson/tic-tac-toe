import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode — the app has no server loaders/actions, so it builds to static
  // assets (build/client) and deploys as a Render Static Site.
  ssr: false,
} satisfies Config;

import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json";
import { sites } from "./build/sites-vite-plugin";

const isSandbox = process.env.CODEX_SANDBOX === "seatbelt";
export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";
  const { cloudflare } = await import("@cloudflare/vite-plugin");
  return {
    server: isSandbox ? { watch: { useFsEvents: false, usePolling: true } } : undefined,
    plugins: [vinext(), sites(), cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
      config: { main: "./worker/index.ts", compatibility_flags: ["nodejs_compat"], d1_databases: [], r2_buckets: [] },
    })],
    define: { __PARKFLOW_PROJECT__: JSON.stringify(hostingConfig.project_id) },
  };
});

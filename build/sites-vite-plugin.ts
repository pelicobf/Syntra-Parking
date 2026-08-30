import { access, cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import type { Plugin } from "vite";
async function exists(path: string) { try { await access(path); return true; } catch { return false; } }
export function sites(): Plugin {
  let root = process.cwd();
  return { name: "sites", apply: "build", configResolved(c) { root = c.root; }, async closeBundle() {
    const out = resolve(root, "dist", ".openai"); await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
    const config = resolve(root, ".openai", "hosting.json"); if (await exists(config)) await cp(config, resolve(out, "hosting.json"));
  }};
}

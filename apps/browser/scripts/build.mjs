import { build } from "esbuild";
import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: ["src/content.ts"],
  bundle: true,
  outfile: "dist/content.js",
  platform: "browser",
  format: "iife",
  sourcemap: true
});

await cp("manifest.json", "dist/manifest.json");

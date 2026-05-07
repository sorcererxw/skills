import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const skillRoot = path.resolve(new URL("..", import.meta.url).pathname);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icon-skill-"));

await fs.mkdir(path.join(tmp, "assets"), { recursive: true });
await fs.writeFile(
  path.join(tmp, "package.json"),
  JSON.stringify({ private: true, dependencies: { vite: "^5.0.0", react: "^18.0.0" } }, null, 2)
);
await fs.copyFile(path.join(skillRoot, "assets/source.svg"), path.join(tmp, "assets/source.svg"));
await fs.copyFile(
  path.join(skillRoot, "examples/icon.config.json"),
  path.join(tmp, "icon.config.json")
);

const tsxBin = path.join(
  skillRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx"
);
const result = spawnSync(tsxBin, ["src/cli.ts", "generate", "--project", tmp, "--snippet"], {
  cwd: skillRoot,
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const expected = [
  "public/favicon.svg",
  "public/favicon.ico",
  "public/apple-touch-icon.png",
  "public/icon-192.png",
  "public/icon-512.png",
  "public/icon-maskable-192.png",
  "public/icon-maskable-512.png",
  "public/manifest.webmanifest",
  "src/components/icons/LogoIcon.tsx",
  "icon-head-snippet.html"
];

for (const relative of expected) {
  await fs.access(path.join(tmp, relative));
}

console.log(`Smoke test passed in ${tmp}`);

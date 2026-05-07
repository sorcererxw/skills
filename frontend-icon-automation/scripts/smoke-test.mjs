import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const skillRoot = path.resolve(new URL("..", import.meta.url).pathname);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "icon-skill-"));
const inputDir = await fs.mkdtemp(path.join(os.tmpdir(), "icon-source-"));
const inputSvg = path.join(inputDir, "source.svg");

await fs.mkdir(path.join(tmp, "app"), { recursive: true });
await fs.mkdir(path.join(tmp, "public/icons"), { recursive: true });
await fs.mkdir(path.join(tmp, "src/components/brand"), { recursive: true });
await fs.writeFile(
  path.join(tmp, "package.json"),
  JSON.stringify({ private: true, dependencies: { vite: "^5.0.0", react: "^18.0.0" } }, null, 2)
);
await fs.writeFile(path.join(tmp, "app/icon.svg"), "<svg viewBox=\"0 0 1 1\"></svg>\n");
await fs.writeFile(path.join(tmp, "public/icons/icon-192.png"), "old icon\n");
await fs.writeFile(path.join(tmp, "public/site.webmanifest"), "{}\n");
await fs.writeFile(path.join(tmp, "src/components/brand/Logo.tsx"), "export function Logo() { return null; }\n");
await fs.copyFile(path.join(skillRoot, "assets/source.svg"), inputSvg);

const tsxBin = path.join(
  skillRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx"
);
const result = spawnSync(tsxBin, ["src/cli.ts", "generate", "--project", tmp, "--input", inputSvg], {
  cwd: skillRoot,
  stdio: "inherit"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const expected = [
  "app/icon.svg",
  "public/logo.svg",
  "public/favicon.svg",
  "public/favicon.ico",
  "public/apple-touch-icon.png",
  "public/icons/icon-192.png",
  "public/icon-512.png",
  "public/icon-maskable-192.png",
  "public/icon-maskable-512.png",
  "public/site.webmanifest",
  "src/components/brand/Logo.tsx"
];

for (const relative of expected) {
  await fs.access(path.join(tmp, relative));
}

const faviconSvg = await fs.readFile(path.join(tmp, "app/icon.svg"), "utf8");
if (!/rx="\d+"/.test(faviconSvg) || !faviconSvg.includes(".favicon-bg")) {
  throw new Error("existing app/icon.svg must be updated with a rounded favicon.");
}

const logoComponent = await fs.readFile(path.join(tmp, "src/components/brand/Logo.tsx"), "utf8");
if (
  !logoComponent.includes('src = "/logo.svg"') ||
  !logoComponent.includes("return <img") ||
  !logoComponent.includes("export function Logo")
) {
  throw new Error("existing React Logo.tsx must be updated to render /logo.svg via img.");
}

const logoSvg = await fs.readFile(path.join(tmp, "public/logo.svg"), "utf8");
if (logoSvg.includes("favicon-bg") || /<rect\b/.test(logoSvg)) {
  throw new Error("logo.svg must not include a favicon background.");
}

try {
  await fs.access(path.join(tmp, "src/assets/icon-source.svg"));
  throw new Error("generator must not create a persistent source SVG copy in src/assets.");
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

for (const forbidden of ["assets/source.svg", "icon.config.json", "icon-head-snippet.html"]) {
  try {
    await fs.access(path.join(tmp, forbidden));
    throw new Error(`generator must not create ${forbidden}.`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

console.log(`Smoke test passed in ${tmp}`);

import prettier from "prettier";
import fs from "fs-extra";
import path from "node:path";

export type ReactLogoTarget = {
  filePath: string;
  componentName: string;
};

const REACT_EXTENSIONS = [".tsx", ".jsx"] as const;

export async function resolveReactLogoTarget(options: {
  projectRoot: string;
  inputPath: string;
  reactDir: string;
  configuredComponentName: string;
  configuredFile?: string;
}): Promise<ReactLogoTarget> {
  const inputName = path.basename(options.inputPath, path.extname(options.inputPath));
  const inferredName = inferLogoComponentName(inputName, options.configuredComponentName);

  if (options.configuredFile) {
    const filePath = path.resolve(options.projectRoot, options.configuredFile);
    return {
      filePath,
      componentName: inferComponentNameFromFile(filePath, inferredName)
    };
  }

  const existing = await findExistingLogoComponent(options.projectRoot, inputName);
  if (existing) {
    return {
      filePath: existing,
      componentName: inferComponentNameFromFile(existing, inferredName)
    };
  }

  const fileName = `${inferredName}.tsx`;
  return {
    filePath: path.join(options.reactDir, fileName),
    componentName: inferredName
  };
}

export async function makeReactComponent(componentName: string): Promise<string> {
  const source = `import type { ImgHTMLAttributes } from "react";

export interface ${componentName}Props extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

export function ${componentName}({
  src = "/logo.svg",
  alt = "",
  ...props
}: ${componentName}Props) {
  return <img src={src} alt={alt} {...props} />;
}

export default ${componentName};
`;

  return prettier.format(source, { parser: "typescript" });
}

function inferLogoComponentName(inputName: string, fallback: string): string {
  const pascal = toPascalCase(inputName);
  if (pascal && /Logo$/i.test(pascal)) return pascal;
  if (inputName.toLowerCase().includes("logo")) return pascal || "Logo";
  return fallback || "Logo";
}

async function findExistingLogoComponent(root: string, inputName: string): Promise<string | undefined> {
  const srcRoot = path.join(root, "src");
  const searchRoot = (await fs.pathExists(srcRoot)) ? srcRoot : root;
  const inputBase = inputName.toLowerCase();
  const exactNames = new Set([
    ...REACT_EXTENSIONS.map((ext) => `${inputBase}${ext}`),
    ...REACT_EXTENSIONS.map((ext) => `logo${ext}`),
    ...REACT_EXTENSIONS.map((ext) => `logo-icon${ext}`),
    ...REACT_EXTENSIONS.map((ext) => `logoicon${ext}`)
  ]);

  const candidates: string[] = [];
  await visit(searchRoot, candidates);

  const ranked = candidates
    .map((candidate) => ({ path: candidate, score: scoreLogoCandidate(candidate, exactNames) }))
    .sort((a, b) => a.score - b.score);

  const best = ranked[0];
  if (!best) return undefined;

  const tied = ranked.filter((candidate) => candidate.score === best.score);
  if (tied.length > 1) {
    const list = tied.map((candidate) => `  - ${path.relative(root, candidate.path)}`).join("\n");
    throw new Error(
      `Multiple existing logo component candidates found. Set react.file in icon.config.json to choose one:\n${list}`
    );
  }

  return best.path;
}

async function visit(dir: string, candidates: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist") {
      continue;
    }

    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await visit(entryPath, candidates);
      continue;
    }

    if (!entry.isFile()) continue;
    const lower = entry.name.toLowerCase();
    if (REACT_EXTENSIONS.some((ext) => lower.endsWith(ext)) && lower.includes("logo")) {
      candidates.push(entryPath);
    }
  }
}

function scoreLogoCandidate(filePath: string, exactNames: Set<string>): number {
  const fileName = path.basename(filePath).toLowerCase();
  if (exactNames.has(fileName)) return 0;
  if (fileName === "logo.tsx") return 1;
  if (fileName === "logo.jsx") return 2;
  if (fileName.includes("logo")) return 10;
  return 100;
}

function inferComponentNameFromFile(filePath: string, fallback: string): string {
  const name = toPascalCase(path.basename(filePath, path.extname(filePath)));
  return name || fallback;
}

function toPascalCase(value: string): string {
  return value
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join("");
}

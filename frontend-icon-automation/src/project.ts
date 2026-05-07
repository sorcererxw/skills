import fs from "fs-extra";
import path from "node:path";

const IGNORED_DIRS = new Set([
  ".git",
  ".next",
  "dist",
  "build",
  "coverage",
  "node_modules",
  "out"
]);

export interface ProjectInfo {
  root: string;
  packageJson?: Record<string, unknown>;
  warnings: string[];
}

export async function detectProject(projectDir: string): Promise<ProjectInfo> {
  const root = path.resolve(projectDir);
  const packageJson = await readPackageJson(root);
  const warnings: string[] = [];

  if (!(await fs.pathExists(root))) {
    throw new Error(`Project directory does not exist: ${root}`);
  }

  if (!packageJson) {
    warnings.push("No package.json found at project root; using directory defaults.");
    return { root, warnings };
  }

  const candidates = await findFrontendCandidates(root, 4);
  const rootIsFrontend = isFrontendPackage(packageJson) || (await hasFrontendShape(root));
  const rootIsMonorepo =
    Boolean(packageJson.workspaces) ||
    (await fs.pathExists(path.join(root, "pnpm-workspace.yaml"))) ||
    (await fs.pathExists(path.join(root, "turbo.json"))) ||
    (await fs.pathExists(path.join(root, "nx.json")));

  if (rootIsMonorepo && !rootIsFrontend && candidates.length > 1) {
    const list = candidates.map((candidate) => `  - ${path.relative(root, candidate)}`).join("\n");
    throw new Error(
      `Multiple frontend app candidates found. Re-run with --project pointing at one app:\n${list}`
    );
  }

  if (rootIsMonorepo && !rootIsFrontend && candidates.length === 1) {
    warnings.push(
      `Monorepo root detected; only one frontend app found at ${path.relative(
        root,
        candidates[0]
      )}. Prefer passing --project explicitly when writing real assets.`
    );
  }

  return { root, packageJson, warnings };
}

async function findFrontendCandidates(root: string, maxDepth: number): Promise<string[]> {
  const candidates: string[] = [];

  async function visit(dir: string, depth: number): Promise<void> {
    if (depth > maxDepth) return;

    const packageJson = await readPackageJson(dir);
    if (packageJson && (isFrontendPackage(packageJson) || (await hasFrontendShape(dir)))) {
      candidates.push(dir);
      return;
    }

    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory() || IGNORED_DIRS.has(entry.name)) continue;
      await visit(path.join(dir, entry.name), depth + 1);
    }
  }

  await visit(root, 0);
  return candidates;
}

async function readPackageJson(dir: string): Promise<Record<string, unknown> | undefined> {
  const packagePath = path.join(dir, "package.json");
  if (!(await fs.pathExists(packagePath))) return undefined;
  return (await fs.readJson(packagePath)) as Record<string, unknown>;
}

function isFrontendPackage(packageJson: Record<string, unknown>): boolean {
  const deps = {
    ...(packageJson.dependencies as Record<string, string> | undefined),
    ...(packageJson.devDependencies as Record<string, string> | undefined)
  };

  return [
    "next",
    "vite",
    "react-scripts",
    "@remix-run/react",
    "astro",
    "@sveltejs/kit",
    "nuxt",
    "vue"
  ].some((name) => Boolean(deps[name]));
}

async function hasFrontendShape(dir: string): Promise<boolean> {
  return (
    (await fs.pathExists(path.join(dir, "index.html"))) ||
    (await fs.pathExists(path.join(dir, "public"))) ||
    (await fs.pathExists(path.join(dir, "src", "app"))) ||
    (await fs.pathExists(path.join(dir, "app")))
  );
}

import fs from "fs-extra";
import path from "node:path";
import type { GenerateOptions, IconConfig } from "./types.js";

export const defaultConfig: IconConfig = {
  input: "assets/source.svg",
  output: {
    publicDir: "public",
    reactDir: "src/components/icons"
  },
  app: {
    name: "My App",
    shortName: "MyApp",
    startUrl: "/",
    scope: "/",
    display: "standalone"
  },
  colors: {
    lightIcon: "#111111",
    darkIcon: "#ffffff",
    appBackground: "#ffffff",
    appForeground: "#111111",
    themeColor: "#ffffff",
    themeColorDark: "#000000",
    backgroundColor: "#ffffff"
  },
  react: {
    enabled: true,
    componentName: "Logo"
  },
  favicon: {
    enabled: true,
    svg: true,
    ico: true,
    paddingRatio: 0.12,
    radiusRatio: 0.22
  },
  pwa: {
    enabled: true,
    manifest: true,
    icons: [192, 512],
    maskable: true
  },
  apple: {
    enabled: true,
    size: 180
  }
};

export async function loadConfig(options: GenerateOptions): Promise<IconConfig> {
  const projectRoot = path.resolve(options.project);
  const configPath = options.config
    ? path.resolve(projectRoot, options.config)
    : path.join(projectRoot, "icon.config.json");

  const fileConfig = (await fs.pathExists(configPath))
    ? await fs.readJson(configPath)
    : {};

  const merged = deepMerge(defaultConfig, fileConfig) as IconConfig;

  if (options.input) {
    merged.input = options.input;
  }

  if (typeof options.react === "boolean") {
    merged.react.enabled = options.react;
  }

  if (typeof options.pwa === "boolean") {
    merged.pwa.enabled = options.pwa;
  }

  validateConfig(merged);
  return merged;
}

function validateConfig(config: IconConfig): void {
  if (!config.input) {
    throw new Error("Missing input SVG path. Set config.input or pass --input.");
  }

  if (!isComponentName(config.react.componentName)) {
    throw new Error(
      `Invalid React componentName "${config.react.componentName}". Use a PascalCase identifier.`
    );
  }

  for (const color of [
    config.colors.lightIcon,
    config.colors.darkIcon,
    config.colors.appBackground,
    config.colors.appForeground,
    config.colors.themeColor,
    config.colors.themeColorDark,
    config.colors.backgroundColor
  ]) {
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
      throw new Error(`Invalid color "${color}". Use a 6-digit hex color.`);
    }
  }

  for (const [name, value] of [
    ["favicon.paddingRatio", config.favicon.paddingRatio],
    ["favicon.radiusRatio", config.favicon.radiusRatio]
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value >= 0.5) {
      throw new Error(`${name} must be a number from 0 to less than 0.5.`);
    }
  }
}

function isComponentName(value: string): boolean {
  return /^[A-Z][A-Za-z0-9]*$/.test(value);
}

function deepMerge(base: unknown, override: unknown): unknown {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override ?? base;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const result: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(override)) {
      result[key] = deepMerge(result[key], value);
    }
    return result;
  }

  return override ?? base;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

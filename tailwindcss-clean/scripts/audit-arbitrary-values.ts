#!/usr/bin/env bun

type Finding = {
  path: string;
  line: number;
  column: number;
  token: string;
  kind: string;
  valueType: string;
  suggestion: Suggestion;
};

type Suggestion = {
  action: "replace" | "review-token" | "keep";
  replacement?: string;
  reason: string;
  token?: StyleToken;
};

type StyleToken = {
  name: string;
  value: string;
  normalizedValue: string;
  path: string;
  line: number;
};

type GlobalClassFinding = {
  path: string;
  line: number;
  selector: string;
  className: string;
  declarations: string[];
  usageCount: number;
  usageFiles: string[];
  suggestion: GlobalClassSuggestion;
};

type GlobalClassSuggestion = {
  action: "inline-class" | "component" | "review" | "keep";
  reason: string;
};

type ScaleMatch = {
  suffix: string;
  distancePx: number;
  targetPx: number;
  exact: boolean;
};

const DEFAULT_EXTENSIONS = new Set([
  ".astro",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".md",
  ".mdx",
  ".scss",
  ".svelte",
  ".ts",
  ".tsx",
  ".vue",
]);

const DEFAULT_SKIP_DIRS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".output",
  ".svelte-kit",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "storybook-static",
  "vendor",
]);

const TOKEN_RE =
  /(?<![A-Za-z0-9_])!?-?[A-Za-z0-9_.\/:%#&=$'"(),+~*\[\]-]*\[[^\]\s`<>]*\][A-Za-z0-9_.\/:%#&=$'"(),+~*\[\]-]*/g;

const CSS_CLASS_RULE_RE = /(^|[}\n])\s*(\.[A-Za-z_-][A-Za-z0-9_-]*[^,{]*)\s*\{([^{}]*)\}/g;
const CSS_CUSTOM_PROPERTY_RE = /(--[A-Za-z0-9_-]+)\s*:\s*([^;{}]+);/g;
const CSS_EXTENSIONS = new Set([".css", ".scss"]);
const COMPONENT_USAGE_COUNT_THRESHOLD = 4;
const COMPONENT_USAGE_FILE_THRESHOLD = 3;

const LENGTH_SCALE = new Map([
  ["0px", "0"],
  ["1px", "px"],
  ["2px", "0.5"],
  ["4px", "1"],
  ["6px", "1.5"],
  ["8px", "2"],
  ["10px", "2.5"],
  ["12px", "3"],
  ["14px", "3.5"],
  ["16px", "4"],
  ["20px", "5"],
  ["24px", "6"],
  ["28px", "7"],
  ["32px", "8"],
  ["36px", "9"],
  ["40px", "10"],
  ["44px", "11"],
  ["48px", "12"],
  ["56px", "14"],
  ["64px", "16"],
  ["80px", "20"],
  ["96px", "24"],
  ["112px", "28"],
  ["128px", "32"],
  ["144px", "36"],
  ["160px", "40"],
  ["176px", "44"],
  ["192px", "48"],
  ["208px", "52"],
  ["224px", "56"],
  ["240px", "60"],
  ["256px", "64"],
  ["288px", "72"],
  ["320px", "80"],
  ["384px", "96"],
  ["0rem", "0"],
  ["0.125rem", "0.5"],
  ["0.25rem", "1"],
  ["0.375rem", "1.5"],
  ["0.5rem", "2"],
  ["0.625rem", "2.5"],
  ["0.75rem", "3"],
  ["0.875rem", "3.5"],
  ["1rem", "4"],
  ["1.25rem", "5"],
  ["1.5rem", "6"],
  ["1.75rem", "7"],
  ["2rem", "8"],
  ["2.25rem", "9"],
  ["2.5rem", "10"],
  ["2.75rem", "11"],
  ["3rem", "12"],
  ["3.5rem", "14"],
  ["4rem", "16"],
  ["5rem", "20"],
  ["6rem", "24"],
  ["7rem", "28"],
  ["8rem", "32"],
  ["9rem", "36"],
  ["10rem", "40"],
  ["11rem", "44"],
  ["12rem", "48"],
  ["13rem", "52"],
  ["14rem", "56"],
  ["15rem", "60"],
  ["16rem", "64"],
  ["18rem", "72"],
  ["20rem", "80"],
  ["24rem", "96"],
]);

const FONT_SIZE_SCALE = new Map([
  ["12px", "xs"],
  ["0.75rem", "xs"],
  ["14px", "sm"],
  ["0.875rem", "sm"],
  ["16px", "base"],
  ["1rem", "base"],
  ["18px", "lg"],
  ["1.125rem", "lg"],
  ["20px", "xl"],
  ["1.25rem", "xl"],
  ["24px", "2xl"],
  ["1.5rem", "2xl"],
  ["30px", "3xl"],
  ["1.875rem", "3xl"],
  ["36px", "4xl"],
  ["2.25rem", "4xl"],
  ["48px", "5xl"],
  ["3rem", "5xl"],
  ["60px", "6xl"],
  ["3.75rem", "6xl"],
  ["72px", "7xl"],
  ["4.5rem", "7xl"],
  ["96px", "8xl"],
  ["6rem", "8xl"],
  ["128px", "9xl"],
  ["8rem", "9xl"],
]);

const RADIUS_SCALE = new Map([
  ["0px", "none"],
  ["2px", "sm"],
  ["0.125rem", "sm"],
  ["4px", ""],
  ["0.25rem", ""],
  ["6px", "md"],
  ["0.375rem", "md"],
  ["8px", "lg"],
  ["0.5rem", "lg"],
  ["12px", "xl"],
  ["0.75rem", "xl"],
  ["16px", "2xl"],
  ["1rem", "2xl"],
  ["24px", "3xl"],
  ["1.5rem", "3xl"],
  ["9999px", "full"],
]);

function parseCsv(value?: string): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function parseArgs(argv: string[]) {
  const options = {
    root: ".",
    extensions: undefined as string | undefined,
    skipDirs: undefined as string | undefined,
    json: false,
    limit: 200,
    failOnFound: false,
  };

  const positional: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--fail-on-found") {
      options.failOnFound = true;
    } else if (arg === "--extensions") {
      options.extensions = argv[++index];
    } else if (arg === "--skip-dirs") {
      options.skipDirs = argv[++index];
    } else if (arg === "--limit") {
      options.limit = Number(argv[++index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional[0]) options.root = positional[0];
  if (!Number.isFinite(options.limit) || options.limit < 0) {
    throw new Error("--limit must be a non-negative number");
  }
  return options;
}

function printHelp() {
  console.log(`Audit Tailwind bracket arbitrary syntax and global CSS class rules.

Usage:
  bun audit-arbitrary-values.ts [root] [--json] [--limit N]

Options:
  --extensions EXT,EXT  File extensions to scan
  --skip-dirs DIR,DIR   Directory names to skip in addition to defaults
  --json                Print machine-readable JSON
  --limit N             Maximum text findings to print. Use 0 for no limit
  --fail-on-found       Exit 1 when any bracket token or global CSS class is found
`);
}

function toPosixPath(path: string): string {
  return path.split(/[\\/]+/).join("/");
}

function relativePath(path: string, root: string): string {
  const rel = path.startsWith(root) ? path.slice(root.length).replace(/^\/+/, "") : path;
  return toPosixPath(rel || ".");
}

function extname(path: string): string {
  const basename = path.split("/").pop() ?? path;
  const index = basename.lastIndexOf(".");
  return index >= 0 ? basename.slice(index) : "";
}

function shouldSkip(path: string, root: string, extensions: Set<string>, skipDirs: Set<string>) {
  const rel = relativePath(path, root);
  const parts = rel.split("/");
  if (parts.slice(0, -1).some((part) => skipDirs.has(part))) return true;
  return !extensions.has(extname(path));
}

async function walk(dir: string, root: string, extensions: Set<string>, skipDirs: Set<string>) {
  const files: string[] = [];
  for await (const entry of new Bun.Glob("**/*").scan({ cwd: dir, dot: true, onlyFiles: true })) {
    const path = `${dir.replace(/\/+$/, "")}/${entry}`;
    if (!shouldSkip(path, root, extensions, skipDirs)) files.push(path);
  }
  return files.sort();
}

function splitClassSegments(token: string): string[] {
  const segments: string[] = [];
  let start = 0;
  let depth = 0;

  for (let index = 0; index < token.length; index += 1) {
    const char = token[index];
    if (char === "[") depth += 1;
    else if (char === "]" && depth > 0) depth -= 1;
    else if (char === ":" && depth === 0) {
      segments.push(token.slice(start, index));
      start = index + 1;
    }
  }
  segments.push(token.slice(start));
  return segments;
}

function classifyKind(token: string): string {
  const segments = splitClassSegments(token);
  const last = segments.at(-1) ?? token;
  if (last.startsWith("[") || token.startsWith("[")) return "arbitrary-variant";
  if (/(?:^|!|-)[A-Za-z][A-Za-z0-9/-]*-\[/.test(last)) return "arbitrary-value";
  if (segments.slice(0, -1).some((segment) => segment.startsWith("[") || segment.includes("-["))) {
    return "variant-or-selector";
  }
  return "bracket-token";
}

function isLikelyTailwindToken(token: string): boolean {
  const segments = splitClassSegments(token);
  const last = segments.at(-1) ?? token;
  if (/(?:^|!|-)-?[A-Za-z][A-Za-z0-9/-]*-\[/.test(last)) return true;
  if (
    segments.some((segment) =>
      /^(?:(?:group|peer)-)?(?:data|aria|supports|has|not|nth)-\[/.test(segment) ||
      /^(?:group|peer)-\[/.test(segment),
    )
  ) {
    return true;
  }
  if (/^\[[^\]]+\]:/.test(token)) return true;
  if (/^\[[^\]]+:[^\]]+\]$/.test(token)) return true;
  return false;
}

function bracketValues(token: string): string[] {
  return [...token.matchAll(/\[([^\]]*)\]/g)].map((match) => match[1] ?? "");
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeColorValue(value: string): string {
  return normalizeValue(value)
    .replace(/^color:/, "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ",")
    .replace(/;$/, "");
}

function isColorValue(value: string): boolean {
  const normalized = normalizeColorValue(value);
  return (
    /^#[0-9a-f]{3,8}\b/.test(normalized) ||
    /^(rgb|rgba|hsl|hsla|oklch|oklab|color|color-mix)\(/.test(normalized)
  );
}

function tokenSuffix(tokenName: string): string {
  return tokenName.replace(/^--color-/, "").replace(/^--/, "");
}

function colorUtilityPrefix(utility: string): string | undefined {
  if (utility === "text") return "text";
  if (utility === "bg" || utility === "background") return "bg";
  if (utility === "border" || utility.startsWith("border-")) return utility;
  if (utility === "ring" || utility.startsWith("ring-")) return utility;
  if (utility === "outline" || utility.startsWith("outline-")) return utility;
  if (utility === "fill") return "fill";
  if (utility === "stroke") return "stroke";
  if (utility === "decoration") return "decoration";
  if (utility === "caret") return "caret";
  if (utility === "accent") return "accent";
  return undefined;
}

function tokenClassForUtility(utility: string, tokenName: string): string | undefined {
  const prefix = colorUtilityPrefix(utility);
  if (!prefix) return undefined;
  return `${prefix}-${tokenSuffix(tokenName)}`;
}

function parseCssLength(value: string): { px: number; unit: string } | undefined {
  const match = normalizeValue(value).match(/^(-?\d+(?:\.\d+)?)(px|rem|em)$/);
  if (!match) return undefined;
  const amount = Number(match[1]);
  const unit = match[2] ?? "";
  if (!Number.isFinite(amount)) return undefined;
  if (unit === "px") return { px: amount, unit };
  return { px: amount * 16, unit };
}

function nearestScaleMatch(value: string, scale: Map<string, string>): ScaleMatch | undefined {
  const parsed = parseCssLength(value);
  if (!parsed) return undefined;

  let best: ScaleMatch | undefined;
  const seenSuffixes = new Set<string>();
  for (const [scaleValue, suffix] of scale.entries()) {
    if (seenSuffixes.has(suffix)) continue;
    seenSuffixes.add(suffix);

    const scaleLength = parseCssLength(scaleValue);
    if (!scaleLength) continue;
    const distancePx = Math.abs(parsed.px - scaleLength.px);
    const exact = distancePx === 0;
    if (
      !best ||
      distancePx < best.distancePx ||
      (distancePx === best.distancePx && scaleLength.px > best.targetPx)
    ) {
      best = { suffix, distancePx, targetPx: scaleLength.px, exact };
    }
  }

  return best;
}

function scaleReason(match: ScaleMatch, scaleName: string, value: string): string {
  if (match.exact) return `Matches the default Tailwind ${scaleName} scale.`;
  const parsed = parseCssLength(value);
  const source = parsed ? `${parsed.px}px` : value;
  return `Closest default Tailwind ${scaleName} scale value; ${source} maps approximately to ${match.targetPx}px.`;
}

function buildToken(segments: string[], last: string): string {
  return [...segments.slice(0, -1), last].join(":");
}

function parseArbitraryUtility(token: string) {
  const segments = splitClassSegments(token);
  const last = segments.at(-1) ?? token;
  const match = last.match(/^(!?)(-?)([A-Za-z][A-Za-z0-9/-]*)-\[(.+)\]$/);
  if (!match) return undefined;
  return {
    segments,
    important: match[1] ?? "",
    negative: match[2] ?? "",
    utility: match[3] ?? "",
    value: match[4] ?? "",
  };
}

function withScaleReplacement(
  parsed: NonNullable<ReturnType<typeof parseArbitraryUtility>>,
  replacementSuffix: string,
) {
  const replacementUtility = replacementSuffix
    ? `${parsed.utility}-${replacementSuffix}`
    : parsed.utility;
  return buildToken(parsed.segments, `${parsed.important}${parsed.negative}${replacementUtility}`);
}

function matchedStyleToken(value: string, styleTokensByValue: Map<string, StyleToken[]>): StyleToken | undefined {
  return styleTokensByValue.get(normalizeColorValue(value))?.[0];
}

function tokenFromRawMatch(raw: string): string {
  const trimmed = raw.replace(/^['"`]+|['"`.,;]+$/g, "");
  const bracketStart = trimmed.indexOf("[");
  if (bracketStart < 0) return trimmed;

  const beforeBracket = trimmed.slice(0, bracketStart);
  const separatorIndex = Math.max(
    beforeBracket.lastIndexOf(" "),
    beforeBracket.lastIndexOf("\t"),
    beforeBracket.lastIndexOf("\""),
    beforeBracket.lastIndexOf("'"),
    beforeBracket.lastIndexOf("`"),
    beforeBracket.lastIndexOf("="),
  );
  return trimmed.slice(separatorIndex + 1).replace(/^['"`]+|['"`.,;]+$/g, "");
}

function suggestionFor(
  token: string,
  kind: string,
  valueType: string,
  styleTokensByValue: Map<string, StyleToken[]>,
  styleTokensByName: Map<string, StyleToken>,
): Suggestion {
  if (kind !== "arbitrary-value") {
    return {
      action: "keep",
      reason: "Arbitrary variant or selector; keep unless the project has a reusable variant abstraction.",
    };
  }

  const parsed = parseArbitraryUtility(token);
  const value = normalizeValue(bracketValues(token).at(-1) ?? "");
  if (!parsed) {
    return {
      action: "review-token",
      reason: "Bracket syntax was detected but no direct utility replacement was inferred.",
    };
  }

  if (value.includes("calc(") || value.includes("minmax(") || value.includes("clamp(")) {
    return {
      action: "keep",
      reason: "Formula-based layout value; keep unless it has become a repeated design token.",
    };
  }

  if (valueType === "color") {
    const matchedToken = matchedStyleToken(value, styleTokensByValue);
    const replacement = matchedToken ? tokenClassForUtility(parsed.utility, matchedToken.name) : undefined;
    if (matchedToken && replacement) {
      return {
        action: "replace",
        replacement: withScaleReplacement(parsed, replacement.replace(`${parsed.utility}-`, "")),
        reason: `Matches global CSS style token ${matchedToken.name} defined in ${matchedToken.path}:${matchedToken.line}.`,
        token: matchedToken,
      };
    }
    if (matchedToken) {
      return {
        action: "review-token",
        reason: `Matches global CSS style token ${matchedToken.name}, but no safe Tailwind utility prefix was inferred for ${parsed.utility}.`,
        token: matchedToken,
      };
    }
    return {
      action: "review-token",
      reason: "Map this color to an existing global CSS style token or add a named theme token if repeated.",
    };
  }

  if (valueType === "css-variable") {
    const variableName = value.match(/var\(\s*(--[A-Za-z0-9_-]+)/)?.[1];
    const matchedToken = variableName ? styleTokensByName.get(variableName) : undefined;
    if (matchedToken) {
      const replacement = tokenClassForUtility(parsed.utility, variableName);
      if (replacement) {
        return {
          action: "replace",
          replacement: withScaleReplacement(parsed, replacement.replace(`${parsed.utility}-`, "")),
          reason: `Uses global CSS style token ${variableName} defined in ${matchedToken.path}:${matchedToken.line}; prefer the tokenized Tailwind utility when available.`,
          token: matchedToken,
        };
      }
    }
    return {
      action: "review-token",
      reason: "Prefer the project Tailwind token for this CSS variable; keep the arbitrary form only if no token exists.",
    };
  }

  if (parsed.utility === "content") {
    return {
      action: "keep",
      reason: "Generated content values usually require arbitrary syntax; keep unless a component abstraction owns it.",
    };
  }

  if (parsed.utility === "text") {
    const match = nearestScaleMatch(value, FONT_SIZE_SCALE);
    if (!match) {
      return {
        action: "review-token",
        reason: "No nearby default font-size class was inferred; compare against project typography tokens.",
      };
    }
    return {
      action: "replace",
      replacement: withScaleReplacement(parsed, match.suffix),
      reason: scaleReason(match, "font-size", value),
    };
  }

  if (parsed.utility === "leading") {
    const match = nearestScaleMatch(value, LENGTH_SCALE);
    if (!match) {
      return {
        action: "review-token",
        reason: "No nearby default line-height class was inferred; compare against project typography tokens.",
      };
    }
    return {
      action: "replace",
      replacement: withScaleReplacement(parsed, match.suffix),
      reason: scaleReason(match, "line-height", value),
    };
  }

  if (parsed.utility === "tracking" && (value === "0" || value === "0px" || value === "0em")) {
    return {
      action: "replace",
      replacement: withScaleReplacement(parsed, "normal"),
      reason: "Zero letter spacing maps to tracking-normal.",
    };
  }

  if (parsed.utility.startsWith("rounded")) {
    const match = nearestScaleMatch(value, RADIUS_SCALE);
    if (!match) {
      return {
        action: "review-token",
        reason: "No nearby default radius class was inferred; compare against project radius tokens.",
      };
    }
    return {
      action: "replace",
      replacement: withScaleReplacement(parsed, match.suffix),
      reason: scaleReason(match, "border-radius", value),
    };
  }

  const lengthMatch = nearestScaleMatch(value, LENGTH_SCALE);
  if (lengthMatch) {
    return {
      action: "replace",
      replacement: withScaleReplacement(parsed, lengthMatch.suffix),
      reason: scaleReason(lengthMatch, "spacing/sizing", value),
    };
  }

  return {
    action: "review-token",
    reason: "No exact default-scale replacement inferred; compare against the project theme before editing.",
  };
}

function classifyValue(token: string): string {
  const joined = bracketValues(token).join(" ").toLowerCase();
  if (isColorValue(joined)) return "color";
  if (joined.includes("var(") || joined.includes("--")) return "css-variable";
  if (joined.includes("calc(") || /\b\d+(\.\d+)?(px|rem|em|vh|vw|%)\b/.test(joined)) {
    return "length";
  }
  if (/\b\d+(\.\d+)?\b/.test(joined)) return "number";
  if (joined.includes("url(")) return "url";
  if (joined.includes("'") || joined.includes('"')) return "content-or-string";
  return "other";
}

function collectGlobalStyleTokens(
  files: string[],
  contents: Map<string, string>,
  root: string,
): StyleToken[] {
  const tokens: StyleToken[] = [];
  for (const file of files) {
    if (!CSS_EXTENSIONS.has(extname(file))) continue;
    const text = contents.get(file);
    if (!text) continue;
    for (const match of text.matchAll(CSS_CUSTOM_PROPERTY_RE)) {
      const name = match[1] ?? "";
      const value = (match[2] ?? "").trim();
      if (!name || !isColorValue(value)) continue;
      tokens.push({
        name,
        value,
        normalizedValue: normalizeColorValue(value),
        path: relativePath(file, root),
        line: lineNumberAt(text, match.index ?? 0),
      });
    }
  }
  return tokens.sort((left, right) => left.name.localeCompare(right.name));
}

function indexStyleTokensByValue(styleTokens: StyleToken[]): Map<string, StyleToken[]> {
  const index = new Map<string, StyleToken[]>();
  for (const token of styleTokens) {
    const existing = index.get(token.normalizedValue) ?? [];
    existing.push(token);
    index.set(token.normalizedValue, existing);
  }
  return index;
}

function indexStyleTokensByName(styleTokens: StyleToken[]): Map<string, StyleToken> {
  const index = new Map<string, StyleToken>();
  for (const token of styleTokens) {
    if (!index.has(token.name)) index.set(token.name, token);
  }
  return index;
}

function lineNumberAt(text: string, index: number): number {
  return text.slice(0, index).split(/\r?\n/).length;
}

function parseDeclarations(block: string): string[] {
  return block
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractClassName(selector: string): string | undefined {
  const match = selector.match(/\.([A-Za-z_-][A-Za-z0-9_-]*)/);
  return match?.[1];
}

function globalClassSuggestion(
  selector: string,
  declarations: string[],
  usageCount: number,
  usageFiles: string[],
): GlobalClassSuggestion {
  if (selector.includes(",")) {
    return {
      action: "review",
      reason: "Grouped selector; split or inline only after confirming every selector usage.",
    };
  }
  if (/[>+~]|\s\./.test(selector.trim())) {
    return {
      action: "review",
      reason: "Compound selector; migrate the directly styled element first and keep structural selector behavior explicit.",
    };
  }
  if (/:(before|after|root|global|where|is|has|not)\b/.test(selector)) {
    return {
      action: "keep",
      reason: "Pseudo/global selector usually cannot be represented as plain inline Tailwind classes.",
    };
  }
  if (declarations.some((declaration) => declaration.startsWith("--"))) {
    return {
      action: "keep",
      reason: "CSS custom property definition; keep in the theme/global layer unless it is component-local state.",
    };
  }
  if (
    usageCount >= COMPONENT_USAGE_COUNT_THRESHOLD ||
    usageFiles.length >= COMPONENT_USAGE_FILE_THRESHOLD
  ) {
    return {
      action: "component",
      reason: `Class is reused ${usageCount} time(s) across ${usageFiles.length} file(s); extract an independent component that owns the Tailwind classes instead of reusing a global CSS class, class string, or variant map.`,
    };
  }
  return {
    action: "inline-class",
    reason: "Global component class should be replaced at usage sites with inline Tailwind classes, then removed when unused.",
  };
}

async function readText(path: string): Promise<string | undefined> {
  try {
    return await Bun.file(path).text();
  } catch {
    return undefined;
  }
}

function countGlobalClassUsages(
  className: string,
  cssPath: string,
  files: string[],
  contents: Map<string, string>,
  root: string,
) {
  const usageFiles = new Set<string>();
  let usageCount = 0;
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const classTokenRe = new RegExp(`(?<![A-Za-z0-9_-])${escaped}(?![A-Za-z0-9_-])`, "g");

  for (const file of files) {
    if (file === cssPath || CSS_EXTENSIONS.has(extname(file))) continue;
    const text = contents.get(file);
    if (!text) continue;
    const matches = [...text.matchAll(classTokenRe)];
    if (matches.length === 0) continue;
    usageCount += matches.length;
    usageFiles.add(relativePath(file, root));
  }

  return { usageCount, usageFiles: [...usageFiles].sort() };
}

function findGlobalClassesInCss(
  path: string,
  root: string,
  files: string[],
  contents: Map<string, string>,
): GlobalClassFinding[] {
  const text = contents.get(path);
  if (!text) return [];

  const findings: GlobalClassFinding[] = [];
  for (const match of text.matchAll(CSS_CLASS_RULE_RE)) {
    const selector = (match[2] ?? "").trim();
    const className = extractClassName(selector);
    if (!className) continue;
    const declarations = parseDeclarations(match[3] ?? "");
    if (declarations.length === 0) continue;
    const { usageCount, usageFiles } = countGlobalClassUsages(
      className,
      path,
      files,
      contents,
      root,
    );
    findings.push({
      path: relativePath(path, root),
      line: lineNumberAt(text, match.index ?? 0),
      selector,
      className,
      declarations,
      usageCount,
      usageFiles,
      suggestion: globalClassSuggestion(selector, declarations, usageCount, usageFiles),
    });
  }
  return findings;
}

async function findInFile(
  path: string,
  root: string,
  styleTokensByValue: Map<string, StyleToken[]>,
  styleTokensByName: Map<string, StyleToken>,
): Promise<Finding[]> {
  const text = await readText(path);
  if (!text) return [];

  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const match of line.matchAll(TOKEN_RE)) {
      const raw = match[0] ?? "";
      const token = tokenFromRawMatch(raw);
      if (!token.includes("[") || !token.includes("]")) continue;
      if (!isLikelyTailwindToken(token)) continue;
      const kind = classifyKind(token);
      const valueType = classifyValue(token);
      findings.push({
        path: relativePath(path, root),
        line: lineIndex + 1,
        column: (match.index ?? 0) + 1,
        token,
        kind,
        valueType,
        suggestion: suggestionFor(token, kind, valueType, styleTokensByValue, styleTokensByName),
      });
    }
  }
  return findings;
}

function countBy(findings: Finding[], key: "kind" | "valueType"): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding[key], (counts.get(finding[key]) ?? 0) + 1);
  }
  return counts;
}

function countSuggestions(findings: Finding[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.suggestion.action, (counts.get(finding.suggestion.action) ?? 0) + 1);
  }
  return counts;
}

function formatCounts(counts: Map<string, number>): string {
  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `${name}=${count}`)
    .join(", ");
}

function printText(findings: Finding[], limit: number) {
  console.log(`Found ${findings.length} bracket Tailwind-like token(s).`);
  if (findings.length === 0) return;
  console.log(`By kind: ${formatCounts(countBy(findings, "kind"))}`);
  console.log(`By value type: ${formatCounts(countBy(findings, "valueType"))}`);
  console.log(`By suggested action: ${formatCounts(countSuggestions(findings))}`);
  console.log();

  let shown = 0;
  let currentPath = "";
  for (const finding of findings) {
    if (shown >= limit) {
      console.log(`... ${findings.length - shown} more finding(s) omitted; rerun with --limit 0 to show all.`);
      return;
    }
    if (finding.path !== currentPath) {
      currentPath = finding.path;
      console.log(currentPath);
    }
    console.log(
      `  ${finding.line}:${finding.column} ${finding.kind}/${finding.valueType} ${finding.token}`,
    );
    const replacement = finding.suggestion.replacement ? ` -> ${finding.suggestion.replacement}` : "";
    console.log(`    ${finding.suggestion.action}${replacement}: ${finding.suggestion.reason}`);
    shown += 1;
  }
}

function countGlobalSuggestions(findings: GlobalClassFinding[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const finding of findings) {
    counts.set(finding.suggestion.action, (counts.get(finding.suggestion.action) ?? 0) + 1);
  }
  return counts;
}

function printGlobalClasses(findings: GlobalClassFinding[], limit: number) {
  console.log();
  console.log(`Found ${findings.length} global CSS class rule(s).`);
  if (findings.length === 0) return;
  console.log(`By suggested action: ${formatCounts(countGlobalSuggestions(findings))}`);
  console.log();

  let shown = 0;
  let currentPath = "";
  for (const finding of findings) {
    if (shown >= limit) {
      console.log(`... ${findings.length - shown} more global class finding(s) omitted; rerun with --limit 0 to show all.`);
      return;
    }
    if (finding.path !== currentPath) {
      currentPath = finding.path;
      console.log(currentPath);
    }
    console.log(`  ${finding.line} .${finding.className} ${finding.selector}`);
    console.log(`    usages=${finding.usageCount}${finding.usageFiles.length ? ` in ${finding.usageFiles.join(", ")}` : ""}`);
    console.log(`    declarations: ${finding.declarations.join("; ")}`);
    console.log(`    ${finding.suggestion.action}: ${finding.suggestion.reason}`);
    shown += 1;
  }
}

function printStyleTokens(styleTokens: StyleToken[], limit: number) {
  console.log();
  console.log(`Found ${styleTokens.length} global CSS color token(s).`);
  if (styleTokens.length === 0) return;
  for (const token of styleTokens.slice(0, limit)) {
    console.log(`  ${token.path}:${token.line} ${token.name}: ${token.value}`);
  }
  if (styleTokens.length > limit) {
    console.log(`... ${styleTokens.length - limit} more color token(s) omitted; rerun with --limit 0 to show all.`);
  }
}

async function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const root = await Bun.file(args.root).exists()
    ? args.root.replace(/\/+$/, "")
    : args.root.replace(/\/+$/, "");
  const extensions = parseCsv(args.extensions);
  const skipDirs = new Set([...DEFAULT_SKIP_DIRS, ...parseCsv(args.skipDirs)]);
  const activeExtensions = extensions.size > 0 ? extensions : DEFAULT_EXTENSIONS;
  const files = await walk(root, root, activeExtensions, skipDirs);
  const contents = new Map<string, string>();
  await Promise.all(
    files.map(async (file) => {
      const text = await readText(file);
      if (text !== undefined) contents.set(file, text);
    }),
  );
  const globalStyleTokens = collectGlobalStyleTokens(files, contents, root);
  const styleTokensByValue = indexStyleTokensByValue(globalStyleTokens);
  const styleTokensByName = indexStyleTokensByName(globalStyleTokens);
  const findings = (
    await Promise.all(files.map((file) => findInFile(file, root, styleTokensByValue, styleTokensByName)))
  ).flat();
  const globalCssClasses = files
    .filter((file) => CSS_EXTENSIONS.has(extname(file)))
    .flatMap((file) => findGlobalClassesInCss(file, root, files, contents));
  const limit =
    args.limit === 0 ? Math.max(findings.length, globalCssClasses.length, globalStyleTokens.length) : args.limit;

  if (args.json) {
    console.log(JSON.stringify({ arbitraryValues: findings, globalCssClasses, globalStyleTokens }, null, 2));
  } else {
    printStyleTokens(globalStyleTokens, limit);
    printText(findings, limit);
    printGlobalClasses(globalCssClasses, limit);
  }

  process.exit(args.failOnFound && (findings.length > 0 || globalCssClasses.length > 0) ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(2);
});

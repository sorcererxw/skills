import { optimize } from "svgo";
import type { NormalizedSvg } from "./types.js";

export function normalizeSvg(svgText: string): NormalizedSvg {
  const withViewBox = ensureViewBox(svgText);
  const optimizedResult = optimize(withViewBox, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false
          }
        }
      },
      "removeDimensions"
    ]
  });

  if ("error" in optimizedResult) {
    throw new Error(`SVGO failed: ${optimizedResult.error}`);
  }

  const optimized = ensureViewBox(optimizedResult.data);
  const viewBox = extractViewBox(optimized);
  const monochrome = isMonochromeSvg(optimized);
  const currentColor = toCurrentColor(optimized);
  const originalBody = stripSvgRoot(optimized);
  const body = monochrome ? stripSvgRoot(currentColor) : originalBody;

  return {
    optimized,
    currentColor,
    viewBox,
    originalBody,
    body,
    monochrome
  };
}

export function extractViewBox(svgText: string): string {
  const match = svgText.match(/\bviewBox=(["'])([^"']+)\1/i);
  if (!match) {
    throw new Error("SVG must include a viewBox or numeric width/height so one can be inferred.");
  }
  return match[2].trim();
}

export function stripSvgRoot(svgText: string): string {
  const match = svgText.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i);
  if (!match) {
    throw new Error("Input is not a valid SVG document with an <svg> root.");
  }
  return match[1].trim();
}

export function makeThemeFaviconSvg(
  svg: NormalizedSvg,
  lightColor: string,
  darkColor: string,
  lightBackground: string,
  darkBackground: string,
  paddingRatio: number,
  radiusRatio: number
): string {
  const size = 64;
  const padding = Math.round(size * paddingRatio);
  const radius = Math.round(size * radiusRatio);
  const contentSize = size - padding * 2;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" color="${lightColor}">`,
    "  <style>",
    "    @media (prefers-color-scheme: dark) {",
    ...(svg.monochrome ? [`      svg { color: ${darkColor}; }`] : []),
    `      .favicon-bg { fill: ${darkBackground}; }`,
    "    }",
    "  </style>",
    `  <rect class="favicon-bg" width="${size}" height="${size}" rx="${radius}" fill="${lightBackground}"/>`,
    `  <svg x="${padding}" y="${padding}" width="${contentSize}" height="${contentSize}" viewBox="${svg.viewBox}">`,
    indent(svg.body, 4),
    "  </svg>",
    "</svg>",
    ""
  ].join("\n");
}

export function makeStaticIconSvg(
  svg: NormalizedSvg,
  size: number,
  foreground: string,
  background: string,
  paddingRatio: number,
  radiusRatio = 0
): string {
  const padding = Math.round(size * paddingRatio);
  const radius = Math.round(size * radiusRatio);
  const contentSize = size - padding * 2;
  const radiusAttribute = radius > 0 ? ` rx="${radius}"` : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
    `  <rect width="${size}" height="${size}"${radiusAttribute} fill="${background}"/>`,
    `  <svg x="${padding}" y="${padding}" width="${contentSize}" height="${contentSize}" viewBox="${svg.viewBox}" color="${foreground}">`,
    indent(svg.body, 4),
    "  </svg>",
    "</svg>"
  ].join("\n");
}

function ensureViewBox(svgText: string): string {
  if (!/<svg\b/i.test(svgText)) {
    throw new Error("Input is not an SVG document.");
  }

  if (/\bviewBox=/i.test(svgText)) {
    return svgText;
  }

  const width = extractNumericAttribute(svgText, "width");
  const height = extractNumericAttribute(svgText, "height");
  if (!width || !height) {
    throw new Error("SVG is missing viewBox and numeric width/height; cannot normalize safely.");
  }

  return svgText.replace(/<svg\b/i, `<svg viewBox="0 0 ${width} ${height}"`);
}

function extractNumericAttribute(svgText: string, attribute: string): string | undefined {
  const match = svgText.match(new RegExp(`\\b${attribute}=(["'])(\\d+(?:\\.\\d+)?)\\1`, "i"));
  return match?.[2];
}

function toCurrentColor(svgText: string): string {
  return svgText
    .replace(/\b(fill|stroke)=(["'])(?!none\b|currentColor\b|url\()([^"']+)\2/gi, "$1=$2currentColor$2")
    .replace(/(fill|stroke)\s*:\s*(?!none\b|currentColor\b|url\()[^;"']+/gi, "$1:currentColor");
}

function isMonochromeSvg(svgText: string): boolean {
  const colors = new Set<string>();
  const colorPatterns = [
    /\b(?:fill|stroke)=(["'])(?!none\b|currentColor\b|url\()([^"']+)\1/gi,
    /(?:fill|stroke)\s*:\s*(?!none\b|currentColor\b|url\()([^;"'}]+)/gi
  ];

  for (const pattern of colorPatterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(svgText)) !== null) {
      const value = (match[2] ?? match[1] ?? "").trim().toLowerCase();
      if (value) colors.add(value);
    }
  }

  return colors.size <= 1;
}

function indent(value: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return value
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
}

import prettier from "prettier";
import type { NormalizedSvg } from "./types.js";

export async function makeReactComponent(
  svg: NormalizedSvg,
  componentName: string
): Promise<string> {
  const jsxBody = toJsxAttributes(svg.body);
  const source = `import type { CSSProperties, SVGProps } from "react";

export interface ${componentName}Props extends SVGProps<SVGSVGElement> {
  title?: string;
  "aria-label"?: string;
  style?: CSSProperties;
}

export function ${componentName}({
  title,
  "aria-label": ariaLabel,
  ...props
}: ${componentName}Props) {
  const labelled = Boolean(title || ariaLabel);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="${svg.viewBox}"
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      aria-label={ariaLabel}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      ${jsxBody}
    </svg>
  );
}

export default ${componentName};
`;

  return prettier.format(source, { parser: "typescript" });
}

function toJsxAttributes(markup: string): string {
  const attributeNames: Record<string, string> = {
    "accent-height": "accentHeight",
    "alignment-baseline": "alignmentBaseline",
    "baseline-shift": "baselineShift",
    "clip-path": "clipPath",
    "clip-rule": "clipRule",
    "color-interpolation": "colorInterpolation",
    "color-interpolation-filters": "colorInterpolationFilters",
    "color-profile": "colorProfile",
    "color-rendering": "colorRendering",
    "dominant-baseline": "dominantBaseline",
    "enable-background": "enableBackground",
    "fill-opacity": "fillOpacity",
    "fill-rule": "fillRule",
    "flood-color": "floodColor",
    "flood-opacity": "floodOpacity",
    "font-family": "fontFamily",
    "font-size": "fontSize",
    "font-size-adjust": "fontSizeAdjust",
    "font-stretch": "fontStretch",
    "font-style": "fontStyle",
    "font-variant": "fontVariant",
    "font-weight": "fontWeight",
    "glyph-name": "glyphName",
    "glyph-orientation-horizontal": "glyphOrientationHorizontal",
    "glyph-orientation-vertical": "glyphOrientationVertical",
    "horiz-adv-x": "horizAdvX",
    "horiz-origin-x": "horizOriginX",
    "image-rendering": "imageRendering",
    "letter-spacing": "letterSpacing",
    "lighting-color": "lightingColor",
    "marker-end": "markerEnd",
    "marker-mid": "markerMid",
    "marker-start": "markerStart",
    "overline-position": "overlinePosition",
    "overline-thickness": "overlineThickness",
    "paint-order": "paintOrder",
    "panose-1": "panose1",
    "pointer-events": "pointerEvents",
    "rendering-intent": "renderingIntent",
    "shape-rendering": "shapeRendering",
    "stop-color": "stopColor",
    "stop-opacity": "stopOpacity",
    "strikethrough-position": "strikethroughPosition",
    "strikethrough-thickness": "strikethroughThickness",
    "stroke-dasharray": "strokeDasharray",
    "stroke-dashoffset": "strokeDashoffset",
    "stroke-linecap": "strokeLinecap",
    "stroke-linejoin": "strokeLinejoin",
    "stroke-miterlimit": "strokeMiterlimit",
    "stroke-opacity": "strokeOpacity",
    "stroke-width": "strokeWidth",
    "text-anchor": "textAnchor",
    "text-decoration": "textDecoration",
    "text-rendering": "textRendering",
    "underline-position": "underlinePosition",
    "underline-thickness": "underlineThickness",
    "unicode-bidi": "unicodeBidi",
    "unicode-range": "unicodeRange",
    "units-per-em": "unitsPerEm",
    "v-alphabetic": "vAlphabetic",
    "v-hanging": "vHanging",
    "v-ideographic": "vIdeographic",
    "v-mathematical": "vMathematical",
    "vector-effect": "vectorEffect",
    "vert-adv-y": "vertAdvY",
    "vert-origin-x": "vertOriginX",
    "vert-origin-y": "vertOriginY",
    "word-spacing": "wordSpacing",
    "writing-mode": "writingMode",
    "x-height": "xHeight",
    "xlink:href": "xlinkHref",
    "xmlns:xlink": "xmlnsXlink",
    class: "className"
  };

  return markup.replace(/\s([:\w-]+)=/g, (match, name: string) => {
    if (name.startsWith("aria-") || name.startsWith("data-")) return match;
    return ` ${attributeNames[name] ?? name}=`;
  });
}

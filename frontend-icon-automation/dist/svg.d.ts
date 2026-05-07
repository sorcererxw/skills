import type { NormalizedSvg } from "./types.js";
export declare function normalizeSvg(svgText: string): NormalizedSvg;
export declare function extractViewBox(svgText: string): string;
export declare function stripSvgRoot(svgText: string): string;
export declare function makeThemeFaviconSvg(svg: NormalizedSvg, lightColor: string, darkColor: string): string;
export declare function makeStaticIconSvg(svg: NormalizedSvg, size: number, foreground: string, background: string, paddingRatio: number): string;

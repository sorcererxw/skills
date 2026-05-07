import prettier from "prettier";
export async function makeHeadSnippet(config) {
    const lines = [];
    if (config.favicon.enabled && config.favicon.ico) {
        lines.push('<link rel="icon" href="/favicon.ico" sizes="32x32" />');
    }
    if (config.favicon.enabled && config.favicon.svg) {
        lines.push('<link rel="icon" href="/favicon.svg" type="image/svg+xml" />');
    }
    if (config.apple.enabled) {
        lines.push('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
    }
    if (config.pwa.enabled && config.pwa.manifest) {
        lines.push('<link rel="manifest" href="/manifest.webmanifest" />');
    }
    lines.push(`<meta name="theme-color" content="${config.colors.themeColor}" media="(prefers-color-scheme: light)" />`, `<meta name="theme-color" content="${config.colors.themeColorDark}" media="(prefers-color-scheme: dark)" />`);
    return prettier.format(`${lines.join("\n")}\n`, { parser: "html" });
}

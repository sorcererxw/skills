import prettier from "prettier";
export async function makeManifest(config) {
    const icons = config.pwa.icons.flatMap((size) => {
        const regular = {
            src: `/icon-${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
            purpose: "any"
        };
        if (!config.pwa.maskable) {
            return [regular];
        }
        return [
            regular,
            {
                src: `/icon-maskable-${size}.png`,
                sizes: `${size}x${size}`,
                type: "image/png",
                purpose: "maskable"
            }
        ];
    });
    const manifest = {
        name: config.app.name,
        short_name: config.app.shortName,
        start_url: config.app.startUrl,
        scope: config.app.scope,
        display: config.app.display,
        theme_color: config.colors.themeColor,
        background_color: config.colors.backgroundColor,
        icons
    };
    return prettier.format(`${JSON.stringify(manifest, null, 2)}\n`, { parser: "json" });
}

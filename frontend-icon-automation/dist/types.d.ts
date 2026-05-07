export type DisplayMode = "fullscreen" | "standalone" | "minimal-ui" | "browser";
export interface IconConfig {
    input: string;
    output: {
        publicDir: string;
        reactDir: string;
    };
    app: {
        name: string;
        shortName: string;
        startUrl: string;
        scope: string;
        display: DisplayMode;
    };
    colors: {
        lightIcon: string;
        darkIcon: string;
        appBackground: string;
        appForeground: string;
        themeColor: string;
        themeColorDark: string;
        backgroundColor: string;
    };
    react: {
        enabled: boolean;
        componentName: string;
        file?: string;
    };
    favicon: {
        enabled: boolean;
        svg: boolean;
        ico: boolean;
        paddingRatio: number;
        radiusRatio: number;
    };
    pwa: {
        enabled: boolean;
        manifest: boolean;
        icons: number[];
        maskable: boolean;
    };
    apple: {
        enabled: boolean;
        size: number;
    };
}
export interface GenerateOptions {
    project: string;
    input?: string;
    config?: string;
    dryRun: boolean;
    react?: boolean;
    pwa?: boolean;
}
export interface NormalizedSvg {
    optimized: string;
    currentColor: string;
    viewBox: string;
    originalBody: string;
    body: string;
    monochrome: boolean;
}
export interface WrittenFile {
    path: string;
    status: "created" | "overwritten" | "planned";
}

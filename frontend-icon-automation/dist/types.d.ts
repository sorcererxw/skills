export type DisplayMode = "fullscreen" | "standalone" | "minimal-ui" | "browser";
export interface IconConfig {
    input: string;
    output: {
        publicDir: string;
        reactDir: string;
        snippetFile: string;
        snippet: boolean;
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
    };
    favicon: {
        enabled: boolean;
        svg: boolean;
        ico: boolean;
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
    snippet?: boolean;
}
export interface NormalizedSvg {
    optimized: string;
    currentColor: string;
    viewBox: string;
    body: string;
}
export interface WrittenFile {
    path: string;
    status: "created" | "overwritten" | "planned";
}

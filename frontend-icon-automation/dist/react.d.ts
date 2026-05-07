export type ReactLogoTarget = {
    filePath: string;
    componentName: string;
};
export declare function resolveReactLogoTarget(options: {
    projectRoot: string;
    inputPath: string;
    reactDir: string;
    configuredComponentName: string;
    configuredFile?: string;
}): Promise<ReactLogoTarget>;
export declare function makeReactComponent(componentName: string): Promise<string>;

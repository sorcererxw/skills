export interface ProjectInfo {
    root: string;
    packageJson?: Record<string, unknown>;
    warnings: string[];
}
export declare function detectProject(projectDir: string): Promise<ProjectInfo>;

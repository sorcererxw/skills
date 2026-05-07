#!/usr/bin/env node
import { Command } from "commander";
import { generateIcons } from "./generate.js";
const program = new Command();
program
    .name("icon-skill")
    .description("Generate favicon, PWA, Apple, maskable, manifest, and React icon outputs from one SVG.")
    .version("0.1.0");
program
    .command("generate")
    .description("Generate icon assets from a source SVG.")
    .option("--project <dir>", "frontend app root", process.cwd())
    .option("--input <svg>", "source SVG path relative to project root")
    .option("--config <json>", "config JSON path relative to project root")
    .option("--dry-run", "print planned writes without changing files", false)
    .option("--no-react", "disable React component generation")
    .option("--no-pwa", "disable PWA icon and manifest generation")
    .option("--snippet", "write icon-head-snippet.html for manual HTML integration", false)
    .action(async (options) => {
    try {
        await generateIcons({
            project: options.project,
            input: options.input,
            config: options.config,
            dryRun: options.dryRun,
            react: options.react,
            pwa: options.pwa,
            snippet: options.snippet
        });
    }
    catch (error) {
        console.error("");
        console.error(error instanceof Error ? error.message : String(error));
        process.exitCode = 1;
    }
});
program.parse(process.argv);

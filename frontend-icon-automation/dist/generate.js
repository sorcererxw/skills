import fs from "fs-extra";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";
import { loadConfig } from "./config.js";
import { makeManifest } from "./manifest.js";
import { detectProject } from "./project.js";
import { makeReactComponent } from "./react.js";
import { makeHeadSnippet } from "./snippet.js";
import { makeStaticIconSvg, makeThemeFaviconSvg, normalizeSvg } from "./svg.js";
export async function generateIcons(options) {
    const project = await detectProject(options.project);
    const config = await loadConfig({ ...options, project: project.root });
    const inputPath = path.resolve(project.root, config.input);
    if (!(await fs.pathExists(inputPath))) {
        throw new Error(`Input SVG does not exist: ${inputPath}`);
    }
    for (const warning of project.warnings) {
        console.warn(`[warn] ${warning}`);
    }
    const svgText = await fs.readFile(inputPath, "utf8");
    const svg = normalizeSvg(svgText);
    const publicDir = path.resolve(project.root, config.output.publicDir);
    const reactDir = path.resolve(project.root, config.output.reactDir);
    const snippetPath = path.resolve(project.root, config.output.snippetFile);
    const written = [];
    if (!options.dryRun) {
        await fs.ensureDir(publicDir);
        if (config.react.enabled) {
            await fs.ensureDir(reactDir);
        }
    }
    if (config.favicon.enabled && config.favicon.svg) {
        await writeFile(path.join(publicDir, "favicon.svg"), makeThemeFaviconSvg(svg, config.colors.lightIcon, config.colors.darkIcon), options.dryRun, written);
    }
    if (config.favicon.enabled && config.favicon.ico) {
        const ico = await makeIco(svg, config);
        await writeFile(path.join(publicDir, "favicon.ico"), ico, options.dryRun, written);
    }
    if (config.apple.enabled) {
        const apple = await renderPng(svg, config.apple.size, config, 0.16);
        await writeFile(path.join(publicDir, "apple-touch-icon.png"), apple, options.dryRun, written);
    }
    if (config.pwa.enabled) {
        for (const size of config.pwa.icons) {
            const regular = await renderPng(svg, size, config, 0.12);
            await writeFile(path.join(publicDir, `icon-${size}.png`), regular, options.dryRun, written);
            if (config.pwa.maskable) {
                const maskable = await renderPng(svg, size, config, 0.2);
                await writeFile(path.join(publicDir, `icon-maskable-${size}.png`), maskable, options.dryRun, written);
            }
        }
        if (config.pwa.manifest) {
            await writeFile(path.join(publicDir, "manifest.webmanifest"), await makeManifest(config), options.dryRun, written);
        }
    }
    if (config.react.enabled) {
        await writeFile(path.join(reactDir, `${config.react.componentName}.tsx`), await makeReactComponent(svg, config.react.componentName), options.dryRun, written);
    }
    if (config.output.snippet) {
        await writeFile(snippetPath, await makeHeadSnippet(config), options.dryRun, written);
    }
    printSummary(written, project.root);
    return written;
}
async function renderPng(svg, size, config, paddingRatio) {
    const iconSvg = makeStaticIconSvg(svg, size, config.colors.appForeground, config.colors.appBackground, paddingRatio);
    return sharp(Buffer.from(iconSvg)).png().toBuffer();
}
async function makeIco(svg, config) {
    const pngs = await Promise.all([16, 32, 48].map((size) => renderPng(svg, size, config, 0.12)));
    return pngToIco(pngs);
}
async function writeFile(filePath, content, dryRun, written) {
    const exists = await fs.pathExists(filePath);
    const status = dryRun ? "planned" : exists ? "overwritten" : "created";
    written.push({ path: filePath, status });
    if (!dryRun) {
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, content);
    }
    console.log(`[${status}] ${filePath}`);
}
function printSummary(written, projectRoot) {
    console.log("");
    console.log("Generated icon outputs:");
    for (const file of written) {
        console.log(`- ${file.status}: ${path.relative(projectRoot, file.path)}`);
    }
    if (written.some((file) => path.basename(file.path) === "icon-head-snippet.html")) {
        console.log("");
        console.log("Reference the generated head snippet from:");
        console.log("- index.html for Vite/static apps");
        console.log("- app/layout.tsx metadata for Next.js App Router");
        console.log("- pages/_document.tsx or a shared Head component for Next.js Pages Router");
        console.log("- framework-specific root head/link exports for Remix, Astro, or SvelteKit");
    }
}

import fs from "fs-extra";
import path from "node:path";
import pngToIco from "png-to-ico";
import sharp from "sharp";
import { loadConfig } from "./config.js";
import { makeManifest } from "./manifest.js";
import { detectProject } from "./project.js";
import { makeReactComponent, resolveReactLogoTarget } from "./react.js";
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
    const written = [];
    if (!options.dryRun) {
        await fs.ensureDir(publicDir);
        if (config.react.enabled) {
            await fs.ensureDir(reactDir);
        }
    }
    if (config.favicon.enabled && config.favicon.svg) {
        await writeFiles(await resolveIconTargets(project.root, path.join(publicDir, "favicon.svg"), [
            "public/favicon.svg",
            "app/favicon.svg",
            "app/icon.svg",
            "src/app/favicon.svg",
            "src/app/icon.svg"
        ], [path.join(publicDir, "favicon.svg")]), () => makeThemeFaviconSvg(svg, config.colors.lightIcon, config.colors.darkIcon, config.colors.appBackground, config.colors.themeColorDark, config.favicon.paddingRatio, config.favicon.radiusRatio), options.dryRun, written);
    }
    if (config.favicon.enabled && config.favicon.ico) {
        const ico = await makeIco(svg, config);
        await writeFiles(await resolveIconTargets(project.root, path.join(publicDir, "favicon.ico"), [
            "public/favicon.ico",
            "app/favicon.ico",
            "src/app/favicon.ico"
        ]), () => ico, options.dryRun, written);
    }
    if (config.apple.enabled) {
        const apple = await renderPng(svg, config.apple.size, config, 0.16);
        await writeFiles(await resolveIconTargets(project.root, path.join(publicDir, "apple-touch-icon.png"), [
            "public/apple-touch-icon.png",
            "public/apple-icon.png",
            "app/apple-icon.png",
            "src/app/apple-icon.png"
        ]), () => apple, options.dryRun, written);
    }
    if (config.pwa.enabled) {
        for (const size of config.pwa.icons) {
            const regular = await renderPng(svg, size, config, 0.12);
            await writeFiles(await resolveIconTargets(project.root, path.join(publicDir, `icon-${size}.png`), [
                `public/icon-${size}.png`,
                `public/icons/icon-${size}.png`,
                `app/icon-${size}.png`,
                `src/app/icon-${size}.png`
            ]), () => regular, options.dryRun, written);
            if (config.pwa.maskable) {
                const maskable = await renderPng(svg, size, config, 0.2);
                await writeFiles(await resolveIconTargets(project.root, path.join(publicDir, `icon-maskable-${size}.png`), [
                    `public/icon-maskable-${size}.png`,
                    `public/icons/icon-maskable-${size}.png`
                ]), () => maskable, options.dryRun, written);
            }
        }
        if (config.pwa.manifest) {
            const manifest = await makeManifest(config);
            await writeFiles(await resolveIconTargets(project.root, path.join(publicDir, "manifest.webmanifest"), [
                "public/manifest.webmanifest",
                "public/site.webmanifest",
                "app/manifest.webmanifest",
                "src/app/manifest.webmanifest"
            ]), () => manifest, options.dryRun, written);
        }
    }
    if (config.react.enabled) {
        const target = await resolveReactLogoTarget({
            projectRoot: project.root,
            inputPath,
            reactDir,
            configuredComponentName: config.react.componentName,
            configuredFile: config.react.file
        });
        await writeFile(target.filePath, await makeReactComponent(target.componentName), options.dryRun, written);
    }
    printSummary(written, project.root);
    return written;
}
async function renderPng(svg, size, config, paddingRatio) {
    const iconSvg = makeStaticIconSvg(svg, size, config.colors.appForeground, config.colors.appBackground, paddingRatio);
    return sharp(Buffer.from(iconSvg)).png().toBuffer();
}
async function makeIco(svg, config) {
    const pngs = await Promise.all([16, 32, 48].map((size) => renderFaviconPng(svg, size, config)));
    return pngToIco(pngs);
}
async function renderFaviconPng(svg, size, config) {
    const iconSvg = makeStaticIconSvg(svg, size, config.colors.appForeground, config.colors.appBackground, config.favicon.paddingRatio, config.favicon.radiusRatio);
    return sharp(Buffer.from(iconSvg)).png().toBuffer();
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
async function writeFiles(filePaths, content, dryRun, written) {
    const value = content();
    for (const filePath of filePaths) {
        await writeFile(filePath, value, dryRun, written);
    }
}
async function resolveIconTargets(projectRoot, defaultPath, candidatePaths, alwaysInclude = []) {
    const existing = [];
    for (const candidate of candidatePaths) {
        const filePath = path.resolve(projectRoot, candidate);
        if (await fs.pathExists(filePath)) {
            existing.push(filePath);
        }
    }
    const targets = existing.length > 0 ? existing : [defaultPath];
    return Array.from(new Set([...targets, ...alwaysInclude.map((filePath) => path.resolve(filePath))]));
}
function printSummary(written, projectRoot) {
    console.log("");
    console.log("Generated icon outputs:");
    for (const file of written) {
        console.log(`- ${file.status}: ${path.relative(projectRoot, file.path)}`);
    }
}

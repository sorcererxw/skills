---
name: frontend-icon-automation
description: Generate frontend application icon assets from a single SVG source. Use when a project needs favicon.svg, favicon.ico, Apple Touch Icon, PWA regular and maskable icons, manifest.webmanifest, or a React currentColor logo component; when consolidating scattered logo/favicon assets; or when producing best-practice web icon outputs without taking responsibility for wiring them into a real frontend app.
---

# Frontend Icon Automation

## Workflow

Use this skill to turn a user-provided SVG into a best-practice set of web, PWA, Apple home screen, Android maskable, desktop install, and optional React logo assets.

Default to asset generation, not app integration. The user can provide the SVG again for future updates; do not create a persistent config file just to support repeated local tweaking.

1. Inspect the target project before generating files:
   - Locate the app root with `pwd`, `git rev-parse --show-toplevel`, `rg --files -g package.json`, and existing `public`, `app`, `src`, `index.html`, `manifest*`, `favicon*`, and logo files.
   - In monorepos, identify the intended app package. If several frontend apps are plausible and the user did not specify one, ask which app to consolidate.
   - Check whether PWA is already supported only to avoid overwriting unrelated assets. Do not promise the generated files are wired into the app unless the user explicitly asks for integration.
2. Run the bundled CLI with the user-provided SVG:

```bash
cd /path/to/app
SKILL_DIR=/path/to/installed/frontend-icon-automation
npm --prefix "$SKILL_DIR" install
npm --prefix "$SKILL_DIR" run icon-skill -- generate --project "$PWD" --input /path/to/source.svg
```

When the skill is loaded by an agent, resolve `SKILL_DIR` from the directory
that contains this `SKILL.md`. Do not assume the original development path.

3. Create or update `icon.config.json` only when the user asks for repeatable project-specific generation, the defaults are insufficient, or the CLI needs non-default directories/colors. Use `examples/icon.config.json` as the starting point.
4. Generate `icon-head-snippet.html` only when the user asks for HTML integration guidance. Treat it as a reference artifact, not proof that the real app is correctly wired.
5. Modify app source files only when the user explicitly asks for integration. For framework-specific integration:
   - HTML/Vite/static: add the generated head snippet to `index.html`.
   - Next.js App Router: prefer `metadata.icons`, `manifest`, `themeColor`, or a `generateMetadata` pattern already used by the app; do not force raw `<head>` tags into `app/layout.tsx` if metadata is already present.
   - React UI: import `src/components/icons/LogoIcon.tsx` where an inline color-controlled logo is needed.
   - Existing logo imports: replace only clearly equivalent old logo/favicon imports. If several logos represent different brands, tenants, environments, or product surfaces, ask before consolidating.
6. Verify generated files. Run formatter/typecheck/tests only when app source files were modified or the user asked for project integration.

## CLI

The CLI lives in this skill folder and accepts:

```bash
icon-skill generate --input assets/source.svg --config icon.config.json
icon-skill generate --project apps/web --input assets/source.svg
icon-skill generate
icon-skill generate --input assets/source.svg --snippet
```

If the installed package binary is unavailable, use:

```bash
npm --prefix "$SKILL_DIR" run icon-skill -- generate [options]
```

Important options:

- `--project <dir>`: frontend app root. Required when monorepo detection is ambiguous.
- `--input <svg>`: source SVG path. Overrides config `input`.
- `--config <json>`: config path. Defaults to `icon.config.json` if present.
- `--dry-run`: report planned outputs without writing.
- `--snippet`: generate `icon-head-snippet.html` for manual HTML integration.

## Outputs

The generator creates output directories before writing and logs every created or overwritten file:

- `public/favicon.svg`: vector favicon with internal `prefers-color-scheme`.
- `public/favicon.ico`: 16, 32, and 48 px fallback icon.
- `public/apple-touch-icon.png`: 180 px opaque Apple home-screen icon.
- `public/icon-192.png` and `public/icon-512.png`: standard PWA icons.
- `public/icon-maskable-192.png` and `public/icon-maskable-512.png`: padded maskable PWA icons.
- `public/manifest.webmanifest`: PWA manifest when enabled.
- `src/components/icons/LogoIcon.tsx`: optional React `currentColor` component.
- `icon-head-snippet.html`: optional head snippet for manual integration, generated only with `--snippet` or config.

## Project Decisions

Prefer the project's existing conventions over forcing defaults. Use these rules:

- If `publicDir` or `reactDir` already exists in config, honor it.
- If a single app root is clear, generate into that app.
- If multiple app roots are plausible, ask before writing.
- If PWA support is absent, generate manifest/icons only when the user wants installation support; otherwise disable `pwa.enabled`.
- If the project uses framework-native metadata, update metadata instead of adding duplicate HTML links, but only when the user asks for integration.
- Keep the SVG source as the only graphic source. Do not hand-edit generated PNG/ICO files.

Read `references/project-integration.md` when making framework-specific edits beyond running the CLI.

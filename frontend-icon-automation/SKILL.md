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
If the user provided an inline or attached SVG rather than a filesystem path,
write it to a temporary file outside the target project, pass that absolute path
to `--input`, and remove the temporary file afterward. Do not create
`src/assets/icon-source.svg`, `assets/source.svg`, or any other persistent copy
of the source SVG inside the target app unless the user explicitly asks to keep
one.

3. Do not create project-local generator config or HTML snippet files. In particular, do not write `icon.config.json` or `icon-head-snippet.html` into the target app. If non-default behavior is needed, pass an existing config path with `--config` or edit the real app integration files only when the user explicitly asks.
4. For React projects, generate or update the logo component from `public/logo.svg`:
   - Prefer an existing `Logo.tsx`, `logo.tsx`, `LogoIcon.tsx`, or similarly named logo component under `src`.
   - If no existing logo component is found, generate one in `src/components/icons/`.
   - The component should render an `<img>` whose default `src` is `/logo.svg`; do not inline the source SVG into TSX.
   - `logo.svg` must be the no-background brand/logo asset. Do not use the rounded favicon as the React logo source.
   - Infer the component name from the input filename when it contains `logo`, such as `brand-logo.svg` -> `BrandLogo.tsx`; otherwise use the configured `react.componentName`.
   - Honor `react.file` when present in config; it is the explicit output path relative to the project root.
5. For existing icon assets, update the existing same-semantics file instead of creating a duplicate default path:
   - Prefer existing favicon/app icon files such as `public/favicon.svg`, `app/icon.svg`, `app/favicon.ico`, or `src/app/icon.svg`.
   - Prefer existing Apple/PWA/manifest files such as `public/apple-touch-icon.png`, `public/icons/icon-192.png`, or `public/site.webmanifest`.
   - If multiple same-semantics icon files already exist, update all of them so stale old icons are not left behind.
6. Modify other app source files only when the user explicitly asks for integration. For framework-specific integration:
   - HTML/Vite/static: add link/meta tags directly to `index.html` only when requested.
   - Next.js App Router: prefer `metadata.icons`, `manifest`, `themeColor`, or a `generateMetadata` pattern already used by the app; do not force raw `<head>` tags into `app/layout.tsx` if metadata is already present.
   - React UI: import the generated or updated logo component where an inline color-controlled logo is needed.
   - Existing logo imports: replace only clearly equivalent old logo/favicon imports. If several logos represent different brands, tenants, environments, or product surfaces, ask before consolidating.
7. Verify generated files. Run formatter/typecheck/tests only when app source files were modified or the user asked for project integration.

## CLI

The CLI lives in this skill folder and accepts:

```bash
icon-skill generate --input assets/source.svg --config icon.config.json
icon-skill generate --project apps/web --input assets/source.svg
icon-skill generate
```

If the installed package binary is unavailable, use:

```bash
npm --prefix "$SKILL_DIR" run icon-skill -- generate [options]
```

Important options:

- `--project <dir>`: frontend app root. Required when monorepo detection is ambiguous.
- `--input <svg>`: source SVG path, absolute or relative to the project root. Overrides config `input`.
- `--config <json>`: config path. Defaults to `icon.config.json` if present.
- `--dry-run`: report planned outputs without writing.

## Outputs

The generator creates output directories before writing and logs every created or overwritten file:

- `public/logo.svg` or an existing logo SVG path: no-background SVG logo for React/UI use.
- `public/favicon.svg` and any existing app/favicon SVG path: rounded vector favicon with internal `prefers-color-scheme`.
- `public/favicon.ico` or an existing favicon ICO path: 16, 32, and 48 px rounded fallback icon.
- `public/apple-touch-icon.png` or an existing Apple icon path: 180 px opaque Apple home-screen icon.
- `public/icon-192.png` and `public/icon-512.png`, or existing equivalent PWA icon paths: standard PWA icons.
- `public/icon-maskable-192.png` and `public/icon-maskable-512.png`, or existing equivalent maskable paths: padded maskable PWA icons.
- `public/manifest.webmanifest` or an existing webmanifest path: PWA manifest when enabled.
- `src/components/icons/Logo.tsx` or an existing logo component path: optional React `<img src="/logo.svg">` component.

The generator does not create or preserve a source SVG copy in the app. The
input SVG is read-only source material. It also does not create generator
config files or HTML snippet files in the app.

## Project Decisions

Prefer the project's existing conventions over forcing defaults. Use these rules:

- If `publicDir` or `reactDir` already exists in config, honor it.
- If a single app root is clear, generate into that app.
- If multiple app roots are plausible, ask before writing.
- If PWA support is absent, generate manifest/icons only when the user wants installation support; otherwise disable `pwa.enabled`.
- If the project uses framework-native metadata, update metadata instead of adding duplicate HTML links, but only when the user asks for integration.
- For React output, prefer updating an existing logo component over creating a duplicate component.
- For icon output, prefer updating existing same-semantics icon files over creating duplicate defaults.
- Always keep `public/logo.svg` available because generated React logo components reference `/logo.svg`.
- For single-color SVG input, both `logo.svg` and `favicon.svg` use CSS and `prefers-color-scheme` to switch icon color automatically between light and dark modes. For multi-color SVG input, preserve the original colors instead of forcing CSS recoloring.
- Keep the user-provided SVG as the only graphic source. Do not copy it into the app, and do not hand-edit generated PNG/ICO files.

Read `references/project-integration.md` when making framework-specific edits beyond running the CLI.

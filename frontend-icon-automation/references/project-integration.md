# Project Integration Notes

Use this reference when the task includes updating a real project after icon generation.

## Discovery

- Use `rg --files -g 'package.json' -g '!node_modules'` to identify app roots.
- Use `rg -n "favicon|apple-touch-icon|manifest|theme-color|logo|LogoIcon|metadata" .` to locate existing references.
- Treat monorepo roots with `workspaces`, `pnpm-workspace.yaml`, `turbo.json`, or `nx.json` as containers. Choose the app package before writing.

## Framework Patterns

- Vite/React/static HTML: update `index.html` with generated `<link>` and `<meta>` tags.
- Next.js App Router: update `app/layout.tsx` or `src/app/layout.tsx` metadata. Prefer `icons`, `manifest`, `themeColor`, and `apple` metadata fields when the project already uses metadata.
- Next.js Pages Router: update `pages/_document.tsx`, `pages/_app.tsx`, or a shared `Head` component only if that is the existing pattern.
- Remix: update `app/root.tsx` `links()` exports.
- Astro/SvelteKit: update the root layout or app HTML template following existing conventions.

## Ambiguity Rules

Ask before changing project files when:

- Multiple frontend apps could own the icons.
- Existing icons represent multiple products, tenants, or themes.
- PWA support is absent and adding a manifest could change install behavior.
- The project has framework-native metadata and raw HTML head tags, and the canonical source is unclear.

Keep generated binary assets out of manual edits. Re-run the generator after changing the source SVG or config.

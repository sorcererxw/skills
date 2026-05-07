# Frontend Icon Automation

Generate all common frontend icon assets from one SVG source file.

```bash
npm install
npm run icon-skill -- generate --project /path/to/app --input assets/source.svg
```

The generator writes favicon, Apple Touch Icon, PWA regular icons, PWA maskable icons, `manifest.webmanifest`, a React `currentColor` component, and an HTML head snippet. Configure behavior with `icon.config.json`; start from `examples/icon.config.json`.

For Codex usage, invoke `$frontend-icon-automation` and ask it to consolidate a frontend project's icons. The skill will inspect the app layout first, handle monorepo ambiguity, and avoid changing framework metadata or existing logo imports when the intended consolidation is unclear.

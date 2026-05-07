---
name: tailwindcss-clean
description: Clean Tailwind CSS styling in frontend projects. Use when asked to audit, reduce, remove, normalize, or replace Tailwind bracket classes such as w-[13px], text-[#111827], bg-[var(--x)], grid-cols-[1fr_auto], arbitrary variants, colors that should map to global CSS style tokens, or custom classes defined in global CSS that should be converged into inline Tailwind classes in JSX, TSX, Vue, Svelte, Astro, HTML, CSS, MDX, className strings, cva/clsx calls, and component style definitions.
---

# Clean Tailwind Arbitrary Values

## Overview

Use this skill to turn ad hoc Tailwind bracket classes and custom global CSS classes into project-native inline utilities, theme tokens, semantic CSS variables, or documented exceptions. Keep behavior and visual output stable; the goal is design-system consistency, not blind removal of every bracket or global rule.

## Workflow

1. Inspect the project styling system before editing:
   - Find `tailwind.config.*`, global CSS, theme files, design tokens, existing component APIs, and utilities such as `cn`, `clsx`, `cva`, or `tailwind-merge`.
   - Identify global CSS color tokens such as `--foreground`, `--muted-foreground`, `--color-card`, `--border`, and theme variables in `:root`, `@theme`, or global CSS layers.
   - Check package scripts for lint, typecheck, tests, Storybook, or visual verification.
   - Note whether Tailwind v3 config scales or Tailwind v4 CSS theme variables are the source of truth.

2. Audit arbitrary syntax:
   - Run `scripts/audit-arbitrary-values.ts` with Bun from this skill against the project root.
   - Treat the output as a worklist, not an automatic rewrite plan.
   - Separate true arbitrary values from necessary arbitrary variants/selectors such as `data-[state=open]:...`, `aria-[expanded=true]:...`, and `[&>*]:...`.
   - Include global CSS class findings from the same script. Treat `.component-name { ... }` style rules in global CSS as candidates for inline Tailwind migration.
   - Include global CSS style token findings from the same script. Use them as the source of truth for color replacements.

3. Produce a replacement plan before editing:
   - Group findings into `replace`, `review-token`, and `keep` buckets.
   - For `replace`, list the exact old class and proposed new class. If the replacement is approximate, state the original value and the nearest scale value.
   - For `review-token`, name the project token, theme key, CSS variable, or dedicated component API that should replace the arbitrary value. For colors, first match against global CSS style tokens by value or `var(--token)` reference. If none exists, propose the smallest token addition and explain why it is reusable.
   - For `keep`, state why the arbitrary value is intentional, such as intrinsic layout, arbitrary selector, generated content, or a one-off formula.
   - For global CSS classes, create a mapping from each `.class-name` to the inline Tailwind class string that should replace it at usage sites. Include unsupported declarations or selectors that require manual review.
   - If a global class is heavily reused, do not inline the same long class string everywhere and do not create a class-string variant map. Propose extracting an independent component that owns the Tailwind classes.
   - Ask for confirmation before broad edits when the plan adds tokens, changes shared components, or touches many files.

4. Replace conservatively:
   - Prefer existing Tailwind scale classes when the value exactly or approximately maps to spacing, sizing, radius, typography, opacity, z-index, shadow, or color tokens.
   - Prefer existing semantic tokens for colors and theme values, for example `bg-card`, `text-muted-foreground`, `border-border`, or project-specific tokens.
   - Prefer dedicated component abstractions when repeated values express a reusable structure or behavior. Avoid adding class-string-only variant maps as the reuse mechanism.
   - Add or extend tokens only when the value is repeated, product-significant, or already implied by the design system. Avoid expanding the theme for isolated layout hacks.
   - Leave rare, intrinsic CSS values when Tailwind has no clearer project-native representation, such as complex `calc(...)`, one-off grid tracks, `content-['']`, masks, and arbitrary selectors. Add a short code comment only when the reason is not obvious.

5. Preserve behavior:
   - Keep responsive prefixes, state prefixes, group/peer/data/aria variants, `!` modifiers, negative modifiers, and class ordering semantics intact.
   - Keep class composition style consistent with the file for local edits, but do not introduce new `cva`/class-string variant maps to replace reused global CSS.
   - Avoid moving visual decisions across component boundaries unless the project already centralizes that pattern.

6. Converge global CSS classes to inline classes:
   - Replace low-reuse global classes at usage sites with inline Tailwind classes in `class`, `className`, `clsx`, `cn`, or framework-specific class bindings.
   - When the same global class is reused 4 or more times, or across 3 or more files, prefer a dedicated component over repeated inline class strings. Do not solve this by creating a reusable class string, `cva` variant, or style constant.
   - Convert plain CSS declarations into Tailwind utilities using the project's tokens first. Use arbitrary utilities only when no scale/token equivalent is appropriate.
   - Preserve pseudo selectors, media queries, keyframes, CSS variables, resets, `@font-face`, and base element styles in global CSS unless the project has an established inline/component abstraction for them.
   - Remove the global CSS rule only after all usage sites are migrated and the audit confirms no remaining references.
   - Prefer moving repeated structure into a named component with clear props rather than keeping a global class or re-exporting a style string.

7. Verify:
   - Run the smallest relevant checks first, then broader checks if shared tokens or shared components changed.
   - For UI-affecting work, run or recommend browser/visual verification for affected screens.
   - Re-run the audit script and report remaining bracket classes or global CSS classes as either fixed, intentional exceptions, or follow-up work.

## Audit Script

Use:

```bash
SKILL_DIR=/path/to/installed/tailwindcss-clean
bun "$SKILL_DIR/scripts/audit-arbitrary-values.ts" /path/to/project
```

When the skill is loaded by an agent, resolve `SKILL_DIR` from the directory
that contains this `SKILL.md`. Do not assume the original development path.

Useful options:

```bash
bun "$SKILL_DIR/scripts/audit-arbitrary-values.ts" . --json
bun "$SKILL_DIR/scripts/audit-arbitrary-values.ts" . --limit 0
bun "$SKILL_DIR/scripts/audit-arbitrary-values.ts" . --fail-on-found
```

The scanner reports bracket Tailwind-like tokens by file, line, kind, rough value type, and a heuristic replacement suggestion. It also reports global CSS color tokens, plus global CSS class rules with declarations, usage counts, usage files, and migration suggestions: `inline-class` for local one-off usage, `component` for heavily reused classes, `review` for complex selectors, and `keep` for global concerns. It intentionally includes arbitrary variants/selectors so the review can decide whether they are legitimate.

Use script suggestions as the first draft of the replacement plan. Confirm them against the project's Tailwind config and design tokens before editing.

## Replacement Heuristics

Use these common mappings only after checking the project's theme:

- Spacing and size: replace `p-[16px]`, `gap-[24px]`, `w-[32px]`, `h-[40px]` with scale classes such as `p-4`, `gap-6`, `w-8`, `h-10` when the project uses the default Tailwind scale.
- Approximate lengths: for plain `px`, `rem`, and `em` arbitrary values, direct replacement with the nearest Tailwind class is acceptable. For example, `w-[13px]` can become the nearest spacing/sizing class such as `w-3.5` under a 16px root scale.
- Typography: replace `text-[14px]`, `leading-[20px]`, `tracking-[0]` with project typography utilities such as `text-sm` and `leading-5`. For `text-[13px]`, choose the nearest type scale class and note that it is approximate.
- Radius: replace `rounded-[8px]` with `rounded-lg` or the nearest project radius class if it exists.
- Colors: replace hex/rgb/hsl/oklch arbitrary classes with semantic tokens already present in global CSS. For example, if global CSS defines `--foreground: #111827`, prefer `text-foreground` over `text-[#111827]`.
- Color token matching: match arbitrary color values against global CSS variables by normalized value, and match `var(--token)` arbitrary classes to the corresponding Tailwind token class when the utility prefix is clear. Do not guess a semantic color name from appearance alone.
- CSS variables: keep `bg-[var(--token)]` only if the project has no Tailwind token for that variable; otherwise prefer the tokenized class.
- Layout formulas: keep `w-[calc(...)]`, `grid-cols-[...]`, and `minmax(...)` when they encode intrinsic layout that would be less readable as a custom token.
- Global CSS classes: replace `.card-shell { padding: 16px; border-radius: 8px; }` with inline classes such as `p-4 rounded-lg` at each usage site, then delete `.card-shell` when unused.
- Reused global CSS classes: if `.card-shell` appears in many places, create a `CardShell` component with `p-4 rounded-lg`, then replace usage sites with that component rather than duplicating the inline class string or creating a reusable class-string variant.
- Global class exceptions: keep selectors for base styles, root variables, fonts, animations, complex pseudo-element content, and cross-cutting browser resets unless the project already has a component-level replacement.

## Reporting

When finished, summarize:

- Files changed and the main classes of replacement.
- Replacement plan applied, including direct substitutions, component abstractions, token mappings, and kept exceptions.
- Checks run and their results.
- Remaining arbitrary classes and global CSS classes, grouped as intentional exceptions or deferred cleanups.

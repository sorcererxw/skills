# sorcererxw/skills

Personal public skills repository for Codex-compatible agents.

Users install this repository with:

```bash
npx skills add sorcererxw/skills
```

After installation, invoke a skill by name in Codex, for example:

```text
Use $frontend-icon-automation to generate favicon and PWA assets from this SVG.
```

## Available Skills

| Skill | Purpose | Main Files |
| --- | --- | --- |
| `frontend-icon-automation` | Generate rounded favicon assets, Apple Touch Icon, PWA regular and maskable icons, `manifest.webmanifest`, and an optional React `currentColor` logo component from one SVG source. | `frontend-icon-automation/SKILL.md`, `frontend-icon-automation/package.json`, `frontend-icon-automation/src/`, `frontend-icon-automation/references/` |
| `tailwindcss-clean` | Audit and replace ad hoc Tailwind bracket values and low-value global CSS classes with project tokens, inline utilities, component abstractions, or documented exceptions. | `tailwindcss-clean/SKILL.md`, `tailwindcss-clean/scripts/audit-arbitrary-values.ts` |
| `to-multica` | Turn planning context into one Multica parent issue plus optional vertical-slice child issues in the todo column. | `to-multica/SKILL.md`, `to-multica/agents/openai.yaml` |

## Repository Layout

Each skill lives in its own top-level directory:

```text
<skill-name>/
  SKILL.md
  agents/
  scripts/
  references/
  assets/
```

`SKILL.md` is the source of truth for when and how an agent should use a skill.
Optional directories should exist only when they directly support that skill.

Repository-wide agent guidance lives in `AGENTS.md`.

## Maintenance Rule

Any change that adds, removes, renames, or materially changes a skill must update
this README in the same change.

When maintaining a skill:

- keep the table in `Available Skills` accurate;
- update usage examples when invocation names change;
- update the listed main files when the skill's structure changes;
- do not remove or rename a public skill without calling out the compatibility
  impact in the change summary;
- keep `AGENTS.md` aligned when repository-wide workflow rules change.

Before publishing or asking users to reinstall, verify the affected skill with
the smallest relevant check, then reinstall from the public repo:

```bash
npx skills add sorcererxw/skills
```

# AGENTS.md

## Purpose

This repository is `sorcererxw/skills`, a personal public skills repository.
Users install it with:

```bash
npx skills add sorcererxw/skills
```

Treat this repository as an installable distribution of agent skills, not as an
application codebase. The root contract is: keep skills easy to discover, easy
to install, and safe for future agents to load through progressive disclosure.

## Repository Shape

Default layout:

```text
<skill-name>/
  SKILL.md
  agents/
    openai.yaml
  scripts/
  references/
  assets/
AGENTS.md
README.md
```

Only `SKILL.md` is required for a skill. Other directories are optional and
should exist only when they directly support that skill.

Use lowercase kebab-case directory names for skills, for example
`feedcontext-briefing` or `html-ppt-editorial`. Keep the skill directory name,
frontmatter `name`, and any user-facing install docs aligned.

## Skill Contract

Every skill must include `<skill-name>/SKILL.md` with YAML frontmatter:

```yaml
---
name: skill-name
description: Clear trigger description for when an agent should use this skill.
---
```

The `description` is the trigger surface. Make it specific enough that an agent
can decide when to load the skill without reading the body.

The body of `SKILL.md` should contain only the workflow and rules needed after
the skill triggers. Prefer concise operational instructions over broad
background explanation.

## Progressive Disclosure

Keep the default context small.

- Put core workflow in `SKILL.md`.
- Put detailed domain references in `references/`.
- Put deterministic helper code in `scripts/`.
- Put reusable templates, images, fonts, and other output assets in `assets/`.
- Avoid README, changelog, quick-reference, or setup files inside individual
  skill directories unless the installer or a concrete workflow requires them.

When a reference file exists, link to it from `SKILL.md` and state when an agent
should read it. Do not make agents scan a directory to discover hidden rules.

## Agents Metadata

If a skill should appear cleanly in UI skill lists, add:

```text
<skill-name>/agents/openai.yaml
```

Keep this metadata consistent with `SKILL.md`. It should describe the same
skill in user-facing language and should not introduce behavior that is absent
from the skill instructions.

## Writing Standards

- Default to English for installable skill content unless the skill is
  explicitly language-specific.
- Use ASCII unless a skill's domain requires non-ASCII examples or output.
- Keep instructions executable: tell the agent what to do, when to read files,
  which commands to run, and what output to produce.
- Prefer scripts for fragile or repeated operations.
- Prefer examples that show the expected shape of input and output.
- Do not include secrets, personal tokens, private account data, or credentials.

## Change Workflow

For any non-trivial update:

1. Identify whether the change affects one skill or repository-wide install
   behavior.
2. Read the relevant `SKILL.md` before editing related resources.
3. Keep edits scoped to the affected skill unless the repository contract needs
   to change.
4. Update `README.md` when installation, available skills, or public usage
   changes.
5. Verify the changed skill can still be installed or loaded through the
   expected `npx skills add sorcererxw/skills` flow when practical.

If installer behavior is uncertain, inspect the current `skills` CLI behavior
before changing the repository layout.

## Verification

Use the smallest check that proves the change:

- Markdown-only update: inspect rendered structure and links.
- Skill instruction update: read the skill as an agent would and confirm the
  trigger description, workflow, and references agree.
- Script update: run the script's targeted smoke test or an equivalent command.
- Metadata update: confirm `agents/openai.yaml` still matches `SKILL.md`.
- Repository layout update: test or dry-run the install path with
  `npx skills add sorcererxw/skills` when safe.

Record any commands that were run in the final handoff. If a relevant check was
not run, state why.

## Boundaries

- Do not turn this repository into a monorepo application.
- Do not add package-manager scaffolding unless a real validation or generation
  workflow needs it.
- Do not duplicate long references across multiple skills; factor shared
  material only when duplication becomes a maintenance problem.
- Do not silently change public skill names. A skill name is part of the install
  and trigger contract.
- Do not remove or rename skills without updating public documentation and
  calling out the compatibility impact.

## Definition Of Done

A repository change is done when:

- affected skill files are updated;
- installation-facing docs remain accurate;
- referenced files and scripts exist at the paths named by `SKILL.md`;
- applicable checks were run or explicitly skipped with a reason;
- the final response names the changed files and the verification performed.

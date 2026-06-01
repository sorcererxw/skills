---
name: to-multica
description: Turn the current conversation context into a fully specified Multica parent issue with vertical-slice child issues in the todo column. Use when the user wants to convert discussed feature work into Multica issues.
---

# To Multica

Turn the current conversation into one Multica parent issue and a set of
vertical-slice child issues. The parent issue captures the full feature
background, product and technical plan, and detailed review checklist. The child
issues are independently grabbable implementation slices mounted under the
parent issue.

Use the Multica CLI for all Multica operations. Do not use GitHub issues for
this skill unless the user explicitly asks for GitHub instead.

## Inputs

Work from the current conversation context first. If the user provides an
existing Multica issue identifier, URL, or UUID, fetch it before drafting:

```bash
multica issue get <issue-id-or-identifier> --output json
multica issue comment list <issue-id-or-identifier> --output json
```

If the user references a specific comment thread, read that thread before
replying or drafting:

```bash
multica issue comment list <issue-id-or-identifier> --thread <thread-id> --tail 30 --output json
```

## Process

### 1. Gather Multica workspace context

Inspect the current Multica workspace before creating anything:

```bash
multica project list --output json
multica issue list --output json --limit 50
multica label list --output json
```

Choose the project as follows:

- If the user names a project, use the matching project.
- If there is exactly one active/relevant project, use it.
- If there are multiple plausible projects and the user did not specify one,
  ask which project to use before creating issues.

Use `status=todo` for all created issues unless the workspace uses a clearly
different todo status in existing issues. Prefer the status value already used
by current todo-column issues.

### 2. Explore the codebase when needed

If the plan depends on repository architecture, read the repository's routing
docs before drafting:

- `CONTEXT.md`
- the relevant agent/domain docs
- relevant package-local `AGENTS.md`
- relevant ADRs

Use the project's domain vocabulary in issue titles and descriptions. If the
conversation conflicts with the documented domain model or ADRs, surface the
conflict before creating issues.

### 3. Synthesize the parent issue

Create one parent issue that is complete enough for future agents and reviewers
to understand the feature without reading the whole chat.

The parent issue body must include:

```markdown
## Background

What problem this feature solves, who it is for, and the important context from
the conversation.

## Goal

The concrete outcome expected when this issue is complete.

## Non-Goals

What is intentionally out of scope.

## User Stories

1. As an <actor>, I want <capability>, so that <benefit>.

## Product Decisions

- Decision and rationale.

## Technical Plan

- The implementation approach in terms of system boundaries and modules.
- Important contracts, data shapes, route/API behavior, runtime behavior, or
  operational behavior.
- Do not include stale-prone file paths or full code snippets unless a small
  prototype snippet captures a decision more precisely than prose.

## Review Checklist

### Product Boundary

- [ ] ...

### Architecture Boundary

- [ ] ...

### Data / Contract

- [ ] ...

### UX / Workflow

- [ ] ...

### Tests And Verification

- [ ] ...

## Implementation Slices

List the proposed vertical slices. If the user chooses not to create child
issues, this section is the authoritative task breakdown on the parent issue.

For each slice include:

- title
- type: AFK / HITL
- blocked by
- scope
- acceptance criteria summary

## Acceptance Criteria

- [ ] User-visible or externally verifiable criterion.
```

Make the review checklist specific and detailed. It should be useful during PR
review, not a generic quality list.

### 4. Split child issues vertically

Break the work into tracer-bullet child issues. Each child issue should deliver a
narrow but complete path through the needed layers. Avoid horizontal slices such
as "database only", "UI only", or "tests only" unless the source plan is itself a
pure infrastructure task.

For each child issue, decide:

- **Title**: short, specific, and action-oriented.
- **Type**: `AFK` if an agent can implement it without human interaction,
  `HITL` if it requires a product/design/architecture decision.
- **Blocked by**: parent or sibling issues that must exist first.
- **Scope**: a complete end-to-end behavior.
- **Acceptance criteria**: concrete checks for that slice.
- **Review checklist**: slice-specific checks that prevent predictable mistakes.

Prefer several thin AFK slices over one large issue. Keep dependencies minimal.

### 5. Confirm whether to create child issues

Before creating anything, show the proposed parent title and vertical-slice
breakdown, then ask the user to choose one of these two publishing modes:

1. **Create child issues**: create one parent issue plus separate Multica child
   issues mounted under it.
2. **Parent issue only**: create only the parent issue and include the task
   breakdown in its `Implementation Slices` section.

This confirmation is required unless the user already explicitly chose one of
these modes in the current request. Do not infer this from a generic "execute"
or "publish" instruction.

Show the split as:

- title
- type: AFK / HITL
- blocked by
- one-sentence scope

Also ask whether the granularity and dependencies are right. Iterate until the
user approves both the publishing mode and the split.

### 6. Create the Multica issues

Create the parent issue first, in the todo column. Always include the
`Implementation Slices` section in the parent body. In "Create child issues"
mode, this section is an overview that references the planned child issues. In
"Parent issue only" mode, this section is the full task breakdown.

```bash
cat <<'ISSUE' | multica issue create \
  --project <project-id> \
  --status todo \
  --title "<parent-title>" \
  --description-stdin \
  --output json
<parent issue body>
ISSUE
```

Capture the returned parent `id` and `identifier`.

If the user chose **Parent issue only**, stop after verifying the parent issue.
Do not create child issues.

If the user chose **Create child issues**, create child issues in dependency
order. Mount each child under the parent with `--parent <parent-id>`:

```bash
cat <<'ISSUE' | multica issue create \
  --project <project-id> \
  --parent <parent-id> \
  --status todo \
  --title "<child-title>" \
  --description-stdin \
  --output json
<child issue body>
ISSUE
```

Use this child body template:

```markdown
## Parent

<parent identifier or id>: <parent title>

## Type

AFK or HITL

## What to build

A concise description of the vertical slice. Describe the end-to-end behavior,
not a layer-by-layer task list.

## Scope Notes

- Important boundaries, assumptions, and exclusions for this slice.

## Acceptance Criteria

- [ ] Criterion 1.
- [ ] Criterion 2.
- [ ] Criterion 3.

## Review Checklist

- [ ] Slice-specific review check.

## Blocked By

- None - can start immediately.
```

When a child depends on another child, create the blocker first, then include
the real blocker identifier in `## Blocked By`.

### 7. Apply labels or metadata only when useful

If the workspace has labels that clearly map to readiness or work type, attach
them with:

```bash
multica issue label add <issue-id> <label-id-or-name>
```

If labels do not exist or the mapping is unclear, leave labels alone.

Use metadata only for durable machine-readable facts, not prose:

```bash
multica issue metadata set <issue-id> <key> <json-value>
```

### 8. Verify creation

After creating issues, verify the parent and, if child issues were requested,
the children:

```bash
multica issue get <parent-id> --output json
multica issue list --project <project-id> --status todo --output json --limit 50
```

Confirm:

- parent is in `todo`
- parent description includes `Implementation Slices`
- if child issues were created, child issues are in `todo`
- if child issues were created, child issues have `parent_issue_id` equal to the
  parent id
- if child issues were created, child descriptions include acceptance criteria
  and review checklist
- dependencies reference real Multica identifiers or clearly remain within the
  parent issue's `Implementation Slices` section

## Important Multica CLI Rules

- Use `--description-stdin` for multiline issue bodies.
- Use `--output json` for create/get/list commands so returned ids can be
  referenced exactly.
- Use `--parent <parent-id>` only when the user confirmed real child issue
  creation.
- Use `--status todo` unless workspace inspection shows a different todo-column
  status.
- Use `--allow-duplicate` only when the user explicitly wants a duplicate or
  duplicate detection blocks an intentional issue.
- Do not close or modify unrelated existing issues.
- Do not assign issues unless the user asks for assignment or the source plan
  clearly requires a specific agent/squad.

## Final Response

Report the chosen publishing mode and created issue identifiers.

```markdown
Created Multica issues:

- <PARENT-ID>: <parent title>
- <CHILD-ID>: <child title> (parent: <PARENT-ID>)
```

If the user chose parent-only mode, report that no child issues were created and
that the breakdown lives in the parent issue's `Implementation Slices` section.

If issue creation was skipped because the user needed to approve the publishing
mode or split, show the proposed split and state that no Multica issues were
created yet.

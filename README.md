# claude-code-interfaces

Reusable component library for Airtable **Interface Extensions**, built with
Claude Code. See `docs/interface-extensions-sdk-research.md` for the full
feasibility research this repo's structure is based on.

Because interface extensions can't be installed cross-base yet, reuse here
happens at the source level: shared packages, thin per-extension apps.

## Layout

```
packages/
  tokens/       design tokens (color, spacing, radii, typography)
  primitives/   presentational React components (Badge, EditableText,
                LinkedRecordPills, DebugPanel)
  helpers/      defensive data-access helpers (safe field access, etc.)
apps/
  <name>/       one @airtable/blocks-cli project per deployed extension,
                a thin wrapper importing the packages above
docs/
  interface-extensions-sdk-research.md   feasibility research
.claude/skills/airtable-extensions/
  SKILL.md    community SDK reference (imports, hooks, field-type read/write
              table, common mistakes) — vendored from Victoria Plummer's
              airtable-interface-extension-toolkit (MIT), see NOTICE.md
```

## Getting started

```
npm install
```

Each package is consumed directly from TypeScript source (no build step
required) via npm workspaces, matching the CLI's sibling-directory bundling.

To scaffold a new deployed extension:

```
npm install -g @airtable/blocks-cli
cd apps
block init <extension-name>
```

then wire it up to import `@claude-code-interfaces/tokens`,
`@claude-code-interfaces/primitives`, and `@claude-code-interfaces/helpers`.

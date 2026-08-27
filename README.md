# claude-code-interfaces

📘 **[Read the repo brief](https://claude.ai/code/artifact/8a46cabd-6cba-41e8-b303-d5a8ab524f57)** — a
styled overview of this repo's layout, packages, and all nine apps.
(Private artifact — share it from claude.ai if others on your team need access.)

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

## Using the design tokens

`@claude-code-interfaces/tokens` exports Airtable's real color palette plus
spacing/radii/typography scales, so primitives and apps can style themselves
without depending on the beta `@airtable/blocks` runtime export:

```ts
import { colors, airtableColors, spacing, radii, typography } from "@claude-code-interfaces/tokens";

// semantic tones, e.g. for a Badge
colors.blue; // "rgb(22, 110, 225)"

// full palette with light/dark variants, e.g. for Tailwind config
airtableColors.blue.light2;
```

## Starting a new extension from a template app

The fastest way to start a new deployed extension is to copy an existing
`apps/` project rather than running `block init` from scratch — you inherit
the shared-package wiring, Tailwind config, lint/tsconfig setup, and editor
rules for free. `apps/test` is the minimal starting point; `apps/pivot-table`,
`apps/gallery`, `apps/kpi-strip`, `apps/scoring-calculator`, `apps/review-queue`,
`apps/org-chart`, `apps/heatmap`, and `apps/search-directory` are fuller
examples if you want to see the primitives/helpers in use, or a pattern
(custom properties, permission-checked writes, cross-table reads) close to
what you're about to build.

```
cp -R apps/test apps/<extension-name>
cd apps/<extension-name>
rm -rf node_modules .tmp .block
```

Then:

1. **Rename the package** — update `name` in `package.json` to
   `@claude-code-interfaces/app-<extension-name>`.
2. **Get a real block ID from Airtable — in the browser, not the CLI.** A
   `blockId` only exists once Airtable's servers create one; nothing local
   can generate a working one. In the target base's Interface Designer, open
   a Dashboard/standalone page → **Add a custom element** → **Create new
   extension** (or the same from Builder Hub's
   [Custom extensions](https://airtable.com/create/extensions) list). Airtable
   hands you either a `block init <baseId-or-NONE>/blk<realId> --template=...
   <dir>` command or creates the placement directly — either way, you only
   need the `<baseId>/blk<realId>` pair out of it, not the template/new-dir
   part, since the directory from step 1 is already your scaffold.
3. **Attach this app to that ID.** Interface extensions are tied to the
   base/block they're attached to (see `docs/interface-extensions-sdk-research.md`,
   finding #4) — the copied `.block/remote.json` pointed at the *old* app's
   block, which is why it's removed above, and a locally-invented ID won't
   work either: Interface Designer's element picker only shows extensions
   Airtable's servers already know about.
   ```
   cd apps/<extension-name>
   block add-remote <baseId-or-NONE>/blk<realId> live
   ```
4. **Install and develop:**
   ```
   npm install
   block run --remote=live
   ```
   In Interface Designer, click `</> Develop` on the element from step 2 and
   point it at the printed URL (typically `https://localhost:9000`). First
   load may need you to visit that URL directly once and accept the
   self-signed certificate warning before Develop will connect.

The app already imports `@claude-code-interfaces/tokens`,
`@claude-code-interfaces/primitives`, and `@claude-code-interfaces/helpers`
as workspace dependencies — keep using those instead of duplicating UI or
data-access logic (see `apps/README.md`).

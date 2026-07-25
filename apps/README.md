# apps/

Each deployed interface extension lives here as its own `@airtable/blocks-cli`
project (created with `block init`, producing a `block.json` manifest and a
`frontend/` directory).

Convention: keep each app a **thin wrapper** — import shared code from
`@claude-code-interfaces/tokens`, `@claude-code-interfaces/primitives`, and
`@claude-code-interfaces/helpers` rather than duplicating UI or data-access
logic. The CLI's sibling-directory bundling (`link`/`file` imports) is what
lets these workspace packages bundle into each extension.

Because interface extensions are tied to the base/interface they were
created in (see `docs/interface-extensions-sdk-research.md`, finding #4),
expect one app directory per deployed base/interface, not one shared build
artifact installed everywhere.

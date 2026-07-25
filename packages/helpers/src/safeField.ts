/**
 * Interface extensions only expose fields explicitly added to the interface's
 * Data panel (and only the first four fields are visible by default on
 * install). table.getFieldByIdIfExists / record.getCellValue throw or return
 * null for anything not exposed, so callers should always go through these
 * helpers. Pattern sourced from the community SKILL.md reference, see
 * .claude/skills/airtable-extensions/SKILL.md ("Common Mistakes to Avoid" #14).
 *
 * Kept structurally typed (no @airtable/blocks import) so this package has
 * no dependency on the beta SDK; swap in real Field/Table/Record types from
 * `@airtable/blocks/interface/ui` once that package is added to an app.
 */

export interface FieldLike {
  id: string;
  name: string;
  type: string;
  options?: { choices?: Array<{ name: string; color?: string }> };
}

export interface TableLike {
  getFieldByIdIfExists(fieldId: string): FieldLike | null;
}

export interface RecordLike {
  getCellValue(fieldId: string): unknown;
  getCellValueAsString(fieldId: string): string;
}

/** Raw cell value, or null if the field isn't exposed to this extension. */
export function getField(record: RecordLike, fieldId: string): unknown {
  try {
    return record.getCellValue(fieldId);
  } catch {
    return null;
  }
}

/** Display-string cell value, or "" if the field isn't exposed to this extension. */
export function getFieldString(record: RecordLike, fieldId: string): string {
  try {
    return record.getCellValueAsString(fieldId);
  } catch {
    return "";
  }
}

export interface FieldMeta {
  choices: string[];
  type: string | null;
}

/** Field schema info for building dropdown UIs — empty/null if not exposed. */
export function getFieldMeta(table: TableLike | null | undefined, fieldId: string): FieldMeta {
  if (!table) return { choices: [], type: null };
  try {
    const field = table.getFieldByIdIfExists(fieldId);
    if (!field) return { choices: [], type: null };
    const choices = field.options?.choices?.map((c) => c.name) ?? [];
    return { choices, type: field.type };
  } catch {
    return { choices: [], type: null };
  }
}

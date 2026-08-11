import { airtableColors, radii, spacing, typography } from "@claude-code-interfaces/tokens";

export interface LinkedRecordPillItem {
  id: string;
  name: string;
}

export interface LinkedRecordPillsProps {
  records: LinkedRecordPillItem[];
  onRemove?: (id: string) => void;
}

/**
 * Presentational pill list for linked-record fields. Callers pass in
 * already-resolved { id, name } pairs (e.g. from useRecords) — this
 * component doesn't call the Airtable SDK directly.
 */
export function LinkedRecordPills({ records, onRemove }: LinkedRecordPillsProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[1] }}>
      {records.map((record) => (
        <span
          key={record.id}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: spacing[1],
            padding: `${spacing[1]} ${spacing[2]}`,
            borderRadius: radii.md,
            backgroundColor: airtableColors.gray.light2,
            fontSize: typography.fontSize.sm,
            color: airtableColors.gray.dark1,
          }}
        >
          {record.name}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(record.id)}
              aria-label={`Remove ${record.name}`}
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                color: airtableColors.gray.base,
                padding: 0,
                fontSize: typography.fontSize.sm,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </span>
      ))}
    </div>
  );
}

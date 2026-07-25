import * as React from "react";
import { colors, radii, spacing, typography } from "@claude-code-interfaces/tokens";

export interface EditableTextProps {
  value: string;
  onCommit: (value: string) => void | Promise<void>;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Click-to-edit text field. Callers own the write (e.g. updateRecordAsync) via
 * onCommit — this component has no dependency on the Airtable SDK.
 */
export function EditableText({ value, onCommit, placeholder, disabled }: EditableTextProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);

  React.useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = async () => {
    setIsEditing(false);
    if (draft !== value) {
      await onCommit(draft);
    }
  };

  if (!isEditing) {
    return (
      <span
        onClick={() => !disabled && setIsEditing(true)}
        style={{
          cursor: disabled ? "default" : "text",
          color: value ? colors.gray[900] : colors.gray[500],
          fontSize: typography.fontSize.md,
        }}
      >
        {value || placeholder || ""}
      </span>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value);
          setIsEditing(false);
        }
      }}
      style={{
        fontSize: typography.fontSize.md,
        padding: spacing[1],
        borderRadius: radii.sm,
        border: `1px solid ${colors.blue[300]}`,
        outline: "none",
      }}
    />
  );
}

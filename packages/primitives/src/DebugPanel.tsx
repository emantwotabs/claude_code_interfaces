import * as React from "react";
import { colors, radii, spacing, typography } from "@claude-code-interfaces/tokens";

export interface DebugPanelProps {
  label?: string;
  data: unknown;
  defaultOpen?: boolean;
}

/**
 * Collapsible JSON inspector for use during development inside an
 * interface extension (e.g. to inspect fields visible in the Data panel).
 */
export function DebugPanel({ label = "Debug", data, defaultOpen = false }: DebugPanelProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div
      style={{
        border: `1px solid ${colors.gray[300]}`,
        borderRadius: radii.md,
        fontFamily: "monospace",
        fontSize: typography.fontSize.xs,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: spacing[2],
          background: colors.gray[50],
          border: "none",
          cursor: "pointer",
          fontWeight: typography.fontWeight.medium,
        }}
      >
        {open ? "▾" : "▸"} {label}
      </button>
      {open && (
        <pre
          style={{
            margin: 0,
            padding: spacing[2],
            overflowX: "auto",
            color: colors.gray[900],
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

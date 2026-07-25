import type { ReactNode } from "react";
import { airtableColorFamily, airtableColors, radii, spacing, typography } from "@claude-code-interfaces/tokens";

export type BadgeTone = "blue" | "green" | "red" | "yellow" | "gray";

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** A select/tag field's raw `color` option (e.g. "blueBright") — overrides `tone` when set. */
  airtableColor?: string;
}

export function Badge({ children, tone = "gray", airtableColor }: BadgeProps) {
  const family = airtableColor ? airtableColorFamily(airtableColor) : tone;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: spacing[1],
        padding: `${spacing[1]} ${spacing[2]}`,
        borderRadius: radii.full,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        color: "#fff",
        backgroundColor: airtableColors[family].base,
      }}
    >
      {children}
    </span>
  );
}

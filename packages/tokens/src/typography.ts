export const typography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  fontSize: {
    xs: "11px",
    sm: "13px",
    md: "14px",
    lg: "16px",
    xl: "20px",
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    bold: 700,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
  },
} as const;

export type TypographyToken = typeof typography;

/**
 * Real Airtable design-token RGB values, sourced from the community
 * airtable-interface-extension-toolkit (MIT, see .claude/skills/airtable-extensions/NOTICE.md).
 * Airtable also exposes these at runtime via `colors`/`colorUtils` from
 * `@airtable/blocks/interface/ui` — this module lets primitives use the same
 * palette without a dependency on that (beta, dist-tagged) package.
 */
export const airtableColors = {
  blue: { base: "rgb(22, 110, 225)", dark1: "rgb(13, 82, 172)", light1: "rgb(160, 198, 255)", light2: "rgb(209, 226, 255)", light3: "rgb(241, 245, 255)" },
  cyan: { base: "rgb(57, 202, 255)", dark1: "rgb(15, 104, 162)", light1: "rgb(136, 219, 255)", light2: "rgb(196, 236, 255)", light3: "rgb(227, 250, 253)" },
  teal: { base: "rgb(1, 221, 213)", dark1: "rgb(23, 114, 110)", light1: "rgb(116, 235, 225)", light2: "rgb(193, 245, 240)", light3: "rgb(228, 251, 251)" },
  green: { base: "rgb(4, 138, 14)", dark1: "rgb(0, 100, 0)", light1: "rgb(154, 224, 149)", light2: "rgb(207, 245, 209)", light3: "rgb(230, 252, 232)" },
  yellow: { base: "rgb(255, 186, 5)", dark1: "rgb(175, 96, 2)", light1: "rgb(255, 214, 107)", light2: "rgb(255, 234, 182)", light3: "rgb(255, 246, 221)" },
  orange: { base: "rgb(213, 68, 1)", dark1: "rgb(170, 45, 0)", light1: "rgb(255, 182, 142)", light2: "rgb(255, 224, 204)", light3: "rgb(255, 236, 227)" },
  red: { base: "rgb(220, 4, 59)", dark1: "rgb(177, 15, 65)", light1: "rgb(255, 166, 193)", light2: "rgb(255, 212, 224)", light3: "rgb(255, 242, 250)" },
  pink: { base: "rgb(221, 4, 168)", dark1: "rgb(171, 10, 131)", light1: "rgb(247, 151, 239)", light2: "rgb(250, 210, 252)", light3: "rgb(255, 241, 255)" },
  purple: { base: "rgb(124, 55, 239)", dark1: "rgb(98, 49, 174)", light1: "rgb(191, 174, 252)", light2: "rgb(224, 218, 253)", light3: "rgb(252, 243, 255)" },
  gray: { base: "rgb(151, 154, 160)", dark1: "rgb(65, 69, 77)", light1: "rgb(196, 199, 205)", light2: "rgb(229, 233, 240)", light3: "rgb(249, 250, 251)" },
} as const;

export type AirtableColorFamily = keyof typeof airtableColors;

/** Maps a select/tag field's `color` option (e.g. "blueBright") to its family. */
export function airtableColorFamily(optionColor: string | undefined): AirtableColorFamily {
  if (!optionColor) return "gray";
  const family = optionColor.replace(/(Bright|Light1|Light2|Dark1)$/, "").toLowerCase();
  return family in airtableColors ? (family as AirtableColorFamily) : "gray";
}

/** Semantic tones used by primitives like Badge, mapped onto the real palette. */
export const colors = {
  blue: airtableColors.blue.base,
  green: airtableColors.green.base,
  red: airtableColors.red.base,
  yellow: airtableColors.yellow.base,
  gray: airtableColors.gray.base,
} as const;

export type ColorToken = typeof colors;

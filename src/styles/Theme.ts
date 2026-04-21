export const RESEARCH_PALETTE = {
  primary: '#3D5AFE',   // Deep Cobalt
  secondary: '#7C4DFF', // Electric Purple — Science Note / EDC indicator
  attention: '#00B8D4', // Rich Teal — allergen matches
  ventilation: '#4ECDE4', // Soft Teal — respiratory/corrosive hazard icon
  neutral: '#303F9F',   // Deep Indigo
  surface: '#F5F7FA',   // Soft Slate
  background: '#FFFFFF',
} as const;

// Status → palette mapping. No red or green.
export const STATUS_COLORS = {
  safe: RESEARCH_PALETTE.primary,
  warning: RESEARCH_PALETTE.secondary,
  avoid: RESEARCH_PALETTE.neutral,
  unknown: '#78909C',
  allergen: RESEARCH_PALETTE.attention,
} as const;

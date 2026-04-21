/**
 * Daily Snapshot — weather-inspired palette (no diagnostic “alert” reds).
 * Use soft gradients + teal/lavender/peach tones for aggregate exposure R&D.
 */
export const SNAPSHOT_GRADIENT = {
  top: '#EDE7F6',
  mid: '#E3F2FD',
  bottom: '#E0F7FA',
} as const;

/** Hour-strip segments — read as sky conditions, not severity bars */
export const SNAPSHOT_SEGMENT = {
  clear: '#B3E5FC',
  light: '#C5CAE9',
  mist: '#B2DFDB',
  warm: '#FFCCBC',
} as const;

export type OutlookTone = 'clear' | 'bright' | 'mixed' | 'shifting';

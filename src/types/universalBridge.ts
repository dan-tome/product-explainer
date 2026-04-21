/**
 * Hooks for validated OCR families (EDC, etc.) will supply this shape.
 * UI-only: bridge does not parse labels.
 */
export interface ValidatedFamilySignal {
  familyId: string;
  /** Short label for the Science Note strip */
  label: string;
  /** Optional subtitle under the label */
  detail?: string;
}

/** Tier 2 aggregate — cumulative research nudge when multi-pathway synergy is detected */
export interface CumulativeResearchNote {
  title: string;
  body: string;
}

export interface AggregateBridgeResult {
  /** Single-pathway Science Note; suppressed when synergy triggers cumulative note */
  validatedFamily: ValidatedFamilySignal | null;
  /** Thyroid (e.g. Resorcinol) + Estrogen (e.g. Oxybenzone) in the same scan */
  synergyActive: boolean;
  cumulativeNote: CumulativeResearchNote | null;
}

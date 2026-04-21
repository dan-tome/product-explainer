/**
 * EDC (Endocrine Disrupting Chemical) reference database.
 *
 * INJECTION POINT for Toxicology Lead — the official array has NOT been received.
 * Current entries are sourced from ECHA SVHC Candidate List (2026),
 * EFSA EDC review criteria, and peer-reviewed literature.
 *
 * To inject the Toxicology Lead's list: replace or extend EDC_ENTRIES below.
 * Each entry requires:
 *   aliases   — all known names/synonyms (lowercase). Used to build the O(1) lookup Map.
 *   family    — chemical family (e.g. "Paraben", "UV Filter")
 *   concern   — short human-readable concern description for the UI
 *   regulation — one-line 2026 regulatory status
 */

export interface EDCEntry {
  aliases: string[];
  family: string;
  concern: string;
  regulation: string;
}

export const EDC_ENTRIES: EDCEntry[] = [
  // ── Parabens ──────────────────────────────────────────────────────────────
  {
    aliases: ['methylparaben'],
    family: 'Paraben',
    concern: 'Potential endocrine disruptor — paraben family',
    regulation: 'EU Annex V restricted. Permitted at ≤0.4% (single) or ≤0.8% (mixed).',
  },
  {
    aliases: ['ethylparaben'],
    family: 'Paraben',
    concern: 'Potential endocrine disruptor — paraben family',
    regulation: 'EU Annex V restricted. Permitted at ≤0.4% (single) or ≤0.8% (mixed).',
  },
  {
    aliases: ['propylparaben'],
    family: 'Paraben',
    concern: 'Potential endocrine disruptor — paraben family (EFSA 2023 review)',
    regulation: 'EFSA 2023: re-evaluated; safe at authorised levels in food. Restricted in cosmetics for infants <3.',
  },
  {
    aliases: ['butylparaben'],
    family: 'Paraben',
    concern: 'Potential endocrine disruptor — paraben family (EFSA 2023 review)',
    regulation: 'EFSA 2023: re-evaluated; safe at authorised levels in food. Restricted in cosmetics for infants <3.',
  },
  {
    aliases: ['isobutylparaben'],
    family: 'Paraben',
    concern: 'Potential endocrine disruptor — paraben family',
    regulation: 'Prohibited in EU cosmetics (Regulation 1223/2009, Annex II).',
  },

  // ── Benzophenones / UV Filters ────────────────────────────────────────────
  {
    aliases: ['oxybenzone', 'benzophenone-3'],
    family: 'UV Filter',
    concern: 'Potential endocrine disruptor — oestrogenic activity reported in vitro',
    regulation: 'ECHA SVHC candidate (2024). Restricted in EU to ≤2.2% in cosmetics. Hawaii/Palau reef-protection ban.',
  },
  {
    aliases: ['homosalate'],
    family: 'UV Filter',
    concern: 'Potential endocrine disruptor — UV filter under EFSA re-evaluation',
    regulation: 'EFSA under review 2024. EU max concentration lowered to 0.5% (Commission Reg. 2021/1099).',
  },
  {
    aliases: ['octinoxate', 'ethylhexyl methoxycinnamate'],
    family: 'UV Filter',
    concern: 'Potential endocrine disruptor — thyroid and oestrogen receptor activity',
    regulation: 'Permitted in EU at ≤7.5%. Marine ecosystem concern; banned in several reef-protection jurisdictions.',
  },
  {
    aliases: ['4-methylbenzylidene camphor', '4-mbc'],
    family: 'UV Filter',
    concern: 'Potential endocrine disruptor — oestrogenic and thyroid effects in animal studies',
    regulation: 'Prohibited in EU cosmetics. Not approved by FDA for use in sunscreens.',
  },

  // ── Antimicrobials ────────────────────────────────────────────────────────
  {
    aliases: ['triclosan'],
    family: 'Antimicrobial',
    concern: 'Potential endocrine disruptor — thyroid hormone disruption; antimicrobial resistance concern',
    regulation: 'Banned from EU cosmetics (2017). FDA 2016 OTC monograph ban in US rinse-off products. ECHA SVHC.',
  },
  {
    aliases: ['triclocarban'],
    family: 'Antimicrobial',
    concern: 'Potential endocrine disruptor — androgen receptor activity reported',
    regulation: 'FDA 2016 OTC monograph ban in US rinse-off products. EU cosmetics ban.',
  },

  // ── Antioxidants ──────────────────────────────────────────────────────────
  {
    aliases: ['bha', 'butylated hydroxyanisole'],
    family: 'Antioxidant',
    concern: 'Potential endocrine disruptor — IARC Group 2B (possibly carcinogenic to humans)',
    regulation: 'Permitted in EU food at restricted levels (E320). EFSA under review. Some national cosmetics restrictions.',
  },
  {
    aliases: ['bht', 'butylated hydroxytoluene'],
    family: 'Antioxidant',
    concern: 'Possible endocrine activity — under EFSA review for thyroid effects',
    regulation: 'Permitted in EU food at restricted levels (E321). EFSA 2023 review ongoing.',
  },

  // ── Cyclosiloxanes ────────────────────────────────────────────────────────
  {
    aliases: ['cyclotetrasiloxane', 'd4'],
    family: 'Cyclosiloxane',
    concern: 'Potential endocrine disruptor — uterotrophic activity in animal studies',
    regulation: 'EU REACH SVHC. Restricted to ≤0.1% in wash-off cosmetics (Reg. 2018/35).',
  },
  {
    aliases: ['cyclopentasiloxane', 'd5'],
    family: 'Cyclosiloxane',
    concern: 'Under regulatory review — environmental persistence and bioaccumulation concern',
    regulation: 'EU REACH restriction under evaluation. Restricted in wash-off cosmetics ≤0.1% (Reg. 2018/35).',
  },
  {
    aliases: ['cyclohexasiloxane', 'd6'],
    family: 'Cyclosiloxane',
    concern: 'Under regulatory review — environmental persistence and bioaccumulation concern',
    regulation: 'EU REACH restriction under evaluation.',
  },

  // ── Phthalates ────────────────────────────────────────────────────────────
  {
    aliases: ['diethyl phthalate', 'dep'],
    family: 'Phthalate',
    concern: 'Potential endocrine disruptor — androgenic disruption in animal studies',
    regulation: 'ECHA SVHC candidate. REACH authorisation required for specific uses.',
  },
  {
    aliases: ['dibutyl phthalate', 'dbp'],
    family: 'Phthalate',
    concern: 'Potential endocrine disruptor — reproductive toxicant (REACH SVHC)',
    regulation: 'ECHA SVHC. Prohibited in EU cosmetics. REACH authorisation required.',
  },
  {
    aliases: ['dimethyl phthalate', 'dmp'],
    family: 'Phthalate',
    concern: 'Potential endocrine disruptor — phthalate family member',
    regulation: 'Under REACH assessment. Permitted in limited applications pending review.',
  },

  // ── Bisphenols ────────────────────────────────────────────────────────────
  {
    // Validated by Toxicology Lead (2026-04-21 transmission)
    aliases: ['bisphenol a', 'bpa', "4,4'-isopropylidenediphenol"],
    family: 'Bisphenol',
    concern: 'Potential endocrine disruptor — mimics oestrogen; linked to reproductive, metabolic, and developmental effects',
    regulation: 'EU: banned in polycarbonate baby bottles (2011) and food-contact materials for infants (2018). ECHA SVHC. FDA under review.',
  },

  // ── Other ─────────────────────────────────────────────────────────────────
  {
    aliases: ['resorcinol'],
    family: 'Phenol',
    concern: 'Potential endocrine disruptor — thyroid function disruption (EFSA)',
    regulation: 'EFSA 2023: reduced ADI. Restricted in EU cosmetics to ≤0.5% for hair dye.',
  },
];
